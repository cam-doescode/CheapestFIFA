import type { Match, TicketListing, ResaleData, ResalePrice } from "./types";

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
