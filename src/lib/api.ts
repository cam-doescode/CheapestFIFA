import type { Match, TicketListing, ResaleData, ResalePrice } from "./types";

// ── Group standings (from ESPN public API) ─────────────────────────────────────
export interface GroupGame {
  teamA: string; // ESPN display name
  teamB: string;
  played: boolean;
  winner: string | null; // ESPN display name of winner, "draw", or null if not played
}

export interface GroupStanding {
  group: string; // "A"–"L"
  teams: Array<{
    name: string;
    points: number;
    gamesPlayed: number;
    gd: number;
    gf: number;
  }>; // sorted 1st → 4th by ESPN rank
  games: GroupGame[]; // all 6 intra-group games (played + remaining) — for lock/tiebreaker logic
}

const ESPN_BASE = "https://site.api.espn.com/apis";

/** Fetch every group-stage match (played + scheduled) in one request. */
async function getGroupStageMatches(): Promise<
  Array<{ teamA: string; teamB: string; played: boolean; winner: string | null }>
> {
  try {
    const res = await fetch(
      `${ESPN_BASE}/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260627&limit=200`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      events?: Array<{
        status: { type: { state: string } };
        competitions: Array<{
          competitors: Array<{ team: { displayName: string }; score?: string; homeAway: string }>;
        }>;
      }>;
    };

    return (data.events ?? []).map(ev => {
      const comp = ev.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === "home") ?? comp.competitors[0];
      const away = comp.competitors.find(c => c.homeAway === "away") ?? comp.competitors[1];
      const played = ev.status.type.state === "post";
      let winner: string | null = null;
      if (played) {
        const hs = parseInt(home.score ?? "0");
        const as = parseInt(away.score ?? "0");
        winner = hs > as ? home.team.displayName : as > hs ? away.team.displayName : "draw";
      }
      return { teamA: home.team.displayName, teamB: away.team.displayName, played, winner };
    });
  } catch {
    return [];
  }
}

export interface KnockoutResult {
  teamA: string;
  teamB: string;
  winner: string; // ESPN display name of winner
  loser: string;  // ESPN display name of loser
}

/**
 * Completed knockout-stage games (R32 → Final), used to advance real teams through
 * the bracket. Empty until the knockout stage begins (June 28). Penalty-shootout
 * winners are reflected by ESPN's reported result.
 */
export async function getKnockoutResults(): Promise<KnockoutResult[]> {
  try {
    const res = await fetch(
      `${ESPN_BASE}/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260719&limit=200`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      events?: Array<{
        status: { type: { state: string } };
        competitions: Array<{
          competitors: Array<{ team: { displayName: string }; score?: string; winner?: boolean; homeAway: string }>;
        }>;
      }>;
    };

    const out: KnockoutResult[] = [];
    for (const ev of data.events ?? []) {
      if (ev.status.type.state !== "post") continue;
      const comp = ev.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === "home") ?? comp.competitors[0];
      const away = comp.competitors.find(c => c.homeAway === "away") ?? comp.competitors[1];
      // Prefer ESPN's explicit winner flag (handles shootouts); fall back to score
      let winnerComp = comp.competitors.find(c => c.winner === true);
      if (!winnerComp) {
        const hs = parseInt(home.score ?? "0");
        const as = parseInt(away.score ?? "0");
        if (hs === as) continue; // no winner recorded yet
        winnerComp = hs > as ? home : away;
      }
      const winner = winnerComp.team.displayName;
      const loser = winner === home.team.displayName ? away.team.displayName : home.team.displayName;
      out.push({ teamA: home.team.displayName, teamB: away.team.displayName, winner, loser });
    }
    return out;
  } catch {
    return [];
  }
}

export async function getGroupStandings(): Promise<GroupStanding[]> {
  try {
    const [res, matches] = await Promise.all([
      fetch(`${ESPN_BASE}/v2/sports/soccer/fifa.world/standings`, { next: { revalidate: 300 } }),
      getGroupStageMatches(),
    ]);
    if (!res.ok) return [];
    const data = await res.json() as {
      children: Array<{
        name: string;
        standings: {
          entries: Array<{
            team: { displayName: string };
            note?: { rank: number };
            stats: Array<{ name: string; value?: number }>;
          }>;
        };
      }>;
    };

    return data.children.map(child => {
      const group = child.name.replace("Group ", "");
      const teams = child.standings.entries
        .map(entry => {
          const stats: Record<string, number> = {};
          for (const s of entry.stats) stats[s.name] = s.value ?? 0;
          return {
            name: entry.team.displayName,
            points: stats.points ?? 0,
            gamesPlayed: stats.gamesPlayed ?? 0,
            gd: stats.pointDifferential ?? 0,
            gf: stats.pointsFor ?? 0,
            _rank: entry.note?.rank ?? 99,
          };
        })
        .sort((a, b) => a._rank - b._rank)
        .map(({ _rank: _r, ...t }) => t);

      // Keep only matches where both teams belong to this group
      const memberNames = new Set(teams.map(t => t.name));
      const games: GroupGame[] = matches
        .filter(m => memberNames.has(m.teamA) && memberNames.has(m.teamB))
        .map(({ teamA, teamB, played, winner }) => ({ teamA, teamB, played, winner }));

      return { group, teams, games };
    });
  } catch {
    return [];
  }
}

const FIFACOLLECT_API = "https://www.fifacollect.info/api";
const COMPETITION_ID = 2; // FIFA World Cup 2026

export async function getMatches(): Promise<Match[]> {
  const res = await fetch(
    `${FIFACOLLECT_API}/matches/GetMatches?competitionId=${COMPETITION_ID}`,
    { next: { revalidate: 3600 } } // cache 1 hour — match data rarely changes
  );
  if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`);
  return res.json();
}

export async function getTicketsByMatch(): Promise<TicketListing[]> {
  const res = await fetch(
    `${FIFACOLLECT_API}/matches/GetTicketsByMatch?competitionId=${COMPETITION_ID}`,
    { next: { revalidate: 300 } } // cache 5 min — prices change
  );
  if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
  const tickets: TicketListing[] = await res.json();

  // Backfill missing face values from snapshot estimates
  const snapshot = await import("@/data/face-values-snapshot.json");
  for (const ticket of tickets) {
    if (!ticket.faceValue) {
      const fallback = (snapshot.faceValues as Array<{ matchNo: number; category: number; faceValue: number | null; estimated?: boolean }>)
        .find((f) => f.matchNo === ticket.match.matchNo && f.category === ticket.category);
      if (fallback?.faceValue) {
        ticket.faceValue = fallback.faceValue;
        ticket.estimatedFaceValue = true;
      }
    }
  }

  // Override placeholder kick-off times (API returns 12:00:00 for all matches)
  const matchSchedule = await import("@/data/match-schedule.json");
  const scheduleMap = matchSchedule.schedule as Record<string, string>;
  for (const ticket of tickets) {
    const correctedDate = scheduleMap[String(ticket.match.matchNo)];
    if (correctedDate) {
      ticket.match.date = correctedDate;
    }
  }

  return tickets;
}

export interface CollectPromo {
  pct: number;
  label: string;
  endsAt: number | null; // unix ms
}

export async function getCollectPromo(): Promise<CollectPromo | null> {
  try {
    const res = await fetch("https://collect.fifa.com/marketplace", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 300 }, // re-check every 5 minutes
    });
    if (!res.ok) return null;
    const html = await res.text();
    const pctMatch = html.match(/(\d+)%\s*(?:off|OFF|Off)/);
    if (!pctMatch) return null;
    const pct = parseInt(pctMatch[1], 10);
    if (pct <= 0 || pct > 50) return null; // sanity check
    const label = /right.to.ticket/i.test(html) ? "on all Right-to-Tickets" : "sitewide";

    // Parse remaining time from "Ends in 18h : 19m : 14s" → absolute timestamp
    let endsAt: number | null = null;
    const countdownMatch = html.match(/[Ee]nds?\s+in\s+(\d+)\s*h\s*[:\s]+\s*(\d+)\s*m\s*[:\s]+\s*(\d+)\s*s/);
    if (countdownMatch) {
      const secs = parseInt(countdownMatch[1]) * 3600 + parseInt(countdownMatch[2]) * 60 + parseInt(countdownMatch[3]);
      endsAt = Date.now() + secs * 1000;
    }

    return { pct, label, endsAt };
  } catch {
    return null;
  }
}

export async function getResaleData(): Promise<ResaleData | null> {
  try {
    const raw = await import("@/data/fifa-marketplace-values-latest.json");
    const data = raw.default as unknown as {
      scraped_at: string;
      matches: Record<string, { categories?: Record<string, { bestPrice: number | null }> }>;
    };

    const prices: ResalePrice[] = [];
    for (const [matchKey, match] of Object.entries(data.matches)) {
      const matchNo = parseInt(matchKey.replace("Match ", ""), 10);
      if (isNaN(matchNo) || !match.categories) continue;
      for (const [catName, cat] of Object.entries(match.categories)) {
        const category = parseInt(catName.replace("Category ", ""), 10);
        if (isNaN(category) || cat.bestPrice == null) continue;
        prices.push({ matchNo, category, price: cat.bestPrice, currency: "USD", scrapedAt: data.scraped_at });
      }
    }

    return { lastScraped: data.scraped_at, prices };
  } catch {
    return null;
  }
}
