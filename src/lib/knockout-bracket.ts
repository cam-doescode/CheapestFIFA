/**
 * Dynamic knockout predictions for every round (R32 → Final), driven entirely by live data.
 *
 * The bracket structure is parsed from the FIFA API match.teams field:
 *   R32 slots reference group positions ("2A", "1E", "3ABCDF");
 *   later rounds reference prior matches ("W74", "L101").
 * Group standings + group/knockout results come from ESPN's public API, refreshed every 5 min.
 *
 * Resolution is a single forward pass in match order. Each side of a match resolves to a set
 * of candidate teams with probabilities:
 *   - a group slot → the projected team (with its confidence) or the clinched team (locked);
 *   - a "W##"/"L##" feeder → the winner/loser of that match: the real result once played,
 *     otherwise the two finalists balanced 50/50 ("balanced until they play, then dynamic").
 * As real results arrive, sides collapse to actual teams and propagate down the bracket.
 */

import type { GroupStanding, KnockoutResult } from "@/lib/api";
import type { KnockoutPrediction, MatchupOption } from "@/data/knockout-predictions";

// ── Name normalisation ─────────────────────────────────────────────────────────
// ESPN display names → internal names used throughout the app (for flags etc.)
const ESPN_TO_INTERNAL: Record<string, string> = {
  "South Korea": "Korea Republic",
  "United States": "USA",
  "Bosnia-Herzegovina": "Bosnia",
  "Cape Verde": "Cabo Verde",
  "Türkiye": "Turkey",
  "Czechia": "Czech Republic",
  "Iran": "IR Iran",
};
function norm(name: string): string {
  return ESPN_TO_INTERNAL[name] ?? name;
}

// ── Slot resolution ────────────────────────────────────────────────────────────

type SlotResult = { team: string; confidence: number; locked: boolean };

const h2hKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Determine the group position a team is *guaranteed* to finish in, or null if it
 * isn't locked. Works by brute-forcing every combination of remaining-game results
 * (win/draw/loss) and applying the FIFA 2026 tiebreaker chain:
 *   points → head-to-head (the new 2026 first tiebreaker) → overall GD/GF.
 *
 * Head-to-head among level teams is computed as a mini-league. If a placement comes
 * down to overall goal difference (which scorelines could still swing), it's treated
 * as "uncertain" so we never report a false lock. A completed group locks every team
 * at its final ESPN rank.
 *
 * Team names here are raw ESPN display names (matching gs.games), normalised only on output.
 */
function lockedPositionFor(teamName: string, gs: GroupStanding): number | null {
  const idx = gs.teams.findIndex(t => t.name === teamName);
  if (idx === -1) return null;

  const remaining = gs.games.filter(g => !g.played);
  if (remaining.length === 0) return idx + 1; // group complete → ESPN order is final

  const basePts = new Map(gs.teams.map(t => [t.name, t.points]));
  const playedH2H = new Map<string, string>();
  for (const g of gs.games) if (g.played && g.winner) playedH2H.set(h2hKey(g.teamA, g.teamB), g.winner);

  const positions = new Set<number>();
  const combos = 3 ** remaining.length;

  for (let c = 0; c < combos; c++) {
    const pts = new Map(basePts);
    const h2h = new Map(playedH2H);

    let cc = c;
    for (const g of remaining) {
      const outcome = cc % 3; cc = Math.floor(cc / 3);
      if (outcome === 0) { pts.set(g.teamA, pts.get(g.teamA)! + 3); h2h.set(h2hKey(g.teamA, g.teamB), g.teamA); }
      else if (outcome === 1) { pts.set(g.teamA, pts.get(g.teamA)! + 1); pts.set(g.teamB, pts.get(g.teamB)! + 1); h2h.set(h2hKey(g.teamA, g.teamB), "draw"); }
      else { pts.set(g.teamB, pts.get(g.teamB)! + 3); h2h.set(h2hKey(g.teamA, g.teamB), g.teamB); }
    }

    const tp = pts.get(teamName)!;
    let above = gs.teams.filter(t => pts.get(t.name)! > tp).length;
    const tied = gs.teams.filter(t => pts.get(t.name)! === tp).map(t => t.name);

    if (tied.length > 1) {
      // Mini-league points among the level teams (FIFA 2026 first tiebreaker)
      const mini = new Map(tied.map(t => [t, 0]));
      for (let i = 0; i < tied.length; i++) {
        for (let j = i + 1; j < tied.length; j++) {
          const w = h2h.get(h2hKey(tied[i], tied[j]));
          if (w === "draw") { mini.set(tied[i], mini.get(tied[i])! + 1); mini.set(tied[j], mini.get(tied[j])! + 1); }
          else if (w === tied[i]) mini.set(tied[i], mini.get(tied[i])! + 3);
          else if (w === tied[j]) mini.set(tied[j], mini.get(tied[j])! + 3);
        }
      }
      const tm = mini.get(teamName)!;
      for (const r of tied) {
        if (r === teamName) continue;
        const rm = mini.get(r)!;
        if (rm > tm) above++;
        else if (rm === tm) return null; // resolved only by goal difference → not a guaranteed lock
      }
    }
    positions.add(above + 1);
    if (positions.size > 1) return null; // position varies across scenarios → not locked
  }

  return positions.size === 1 ? [...positions][0] : null;
}

/** Confidence that a team holds their current group position by end of group stage. */
function positionConfidence(ptsLead: number, gamesLeft: number): number {
  if (gamesLeft === 0) return 98;
  if (ptsLead > gamesLeft * 3) return 95; // mathematically secured
  if (ptsLead >= 4) return 88;
  if (ptsLead >= 3) return 80;
  if (ptsLead >= 2) return 68;
  if (ptsLead >= 1) return 56;
  return 40; // tied
}

/** Resolve a direct slot like "1A" or "2B" to the current team at that position. */
function resolveDirectSlot(slot: string, map: Map<string, GroupStanding>): SlotResult {
  const pos = parseInt(slot[0]) - 1; // "1" → 0, "2" → 1
  const group = slot[1];
  const gs = map.get(group);
  if (!gs || gs.teams.length <= pos) return { team: "TBD", confidence: 25, locked: false };

  const team = gs.teams[pos];
  const below = gs.teams[pos + 1];
  const ptsLead = below ? team.points - below.points : team.points;
  const gamesLeft = 3 - team.gamesPlayed;
  // Locked only if guaranteed to finish in exactly this slot's position (1st or 2nd)
  const locked = lockedPositionFor(team.name, gs) === pos + 1;

  return {
    team: norm(team.name),
    confidence: locked ? 100 : positionConfidence(ptsLead, gamesLeft),
    locked,
  };
}

/**
 * Compute the 8 3rd-place slot → team assignments globally.
 *
 * Each group contributes one 3rd-place team. The 8 best (by pts, GD, GF) advance
 * to the knockout round. Each of the 8 3rd-place slots specifies which groups are
 * eligible (e.g. "3ABCDF" means the assigned team must come from A, B, C, D, or F).
 *
 * We use a "most constrained first" greedy bipartite matching: repeatedly assign the
 * best available team to the slot that has the fewest remaining eligible teams.
 * This avoids assigning the same team to multiple slots (the naive per-slot approach fails).
 */
function computeThirdPlaceAssignments(
  map: Map<string, GroupStanding>,
  slots: { matchNo: number; groups: string[] }[],
): Map<number, SlotResult> {
  const allComplete = [...map.values()].length > 0 && [...map.values()].every(gs => gs.games.length > 0 && gs.games.every(g => g.played));

  // Collect and rank all 12 groups' 3rd-place teams
  type Third = {
    group: string; team: string;
    points: number; gd: number; gf: number; gamesPlayed: number;
  };
  const thirds: Third[] = [];
  for (const [group, gs] of map) {
    if (gs.teams.length < 3) continue;
    const t = gs.teams[2];
    thirds.push({ group, team: norm(t.name), points: t.points, gd: t.gd, gf: t.gf, gamesPlayed: t.gamesPlayed });
  }
  // Cross-group ranking of 3rd-place teams uses FIFA's order: points → goal difference
  // → goals scored. Head-to-head (the new first tiebreaker for 2026) only applies between
  // teams in the SAME group, so it never enters this cross-group comparison.
  // Within-group order (1st/2nd/3rd) comes from ESPN's rank, which already applies the
  // full 2026 chain including head-to-head.
  thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  const top8 = new Set(thirds.slice(0, 8).map(t => t.group));

  const assignments = new Map<number, SlotResult>();
  const usedGroups = new Set<string>();

  // How many remaining eligible top-8 slots a given group has (excluding current slot).
  // Used to find the "least flexible" top-8 team to assign (CSP: least constraining value).
  const countTop8Alts = (grp: string, excludeMatchNo: number): number =>
    slots.filter(s => s.matchNo !== excludeMatchNo && !assignments.has(s.matchNo) && s.groups.includes(grp)).length;

  // Greedily fill slots using "most constrained first" (slot with fewest eligible top-8 teams).
  // Within each slot, pick the least flexible top-8 team (fewest alternative slots it could fill).
  // Non-top-8 teams are only used as fallback when no top-8 team remains for a slot.
  for (let iter = 0; iter < slots.length; iter++) {
    let bestSlotIdx = -1;
    let minEligible = Infinity;

    for (let si = 0; si < slots.length; si++) {
      if (assignments.has(slots[si].matchNo)) continue;
      const eligibleCount = slots[si].groups.filter(g => !usedGroups.has(g) && top8.has(g)).length;
      if (eligibleCount < minEligible) {
        minEligible = eligibleCount;
        bestSlotIdx = si;
      }
    }
    if (bestSlotIdx === -1) break;

    const slot = slots[bestSlotIdx];

    // Prefer top-8 teams; pick the one with fewest alternative eligible slots
    const top8Eligible = slot.groups
      .filter(g => !usedGroups.has(g) && top8.has(g))
      .map(g => thirds.find(t => t.group === g))
      .filter((t): t is Third => !!t)
      .sort((a, b) => {
        const altDiff = countTop8Alts(a.group, slot.matchNo) - countTop8Alts(b.group, slot.matchNo);
        if (altDiff !== 0) return altDiff;
        return b.points - a.points || b.gd - a.gd || b.gf - a.gf;
      });

    const best = top8Eligible[0] ?? thirds.find(t => !usedGroups.has(t.group) && slot.groups.includes(t.group));

    if (!best) {
      assignments.set(slot.matchNo, { team: "TBD", confidence: 10, locked: false });
      continue;
    }

    const gs = map.get(best.group)!;
    const below = gs.teams[3];
    const ptsLead = below ? best.points - below.points : best.points;
    const holdConf = positionConfidence(ptsLead, 3 - best.gamesPlayed);
    const qualifyConf = top8.has(best.group) ? 85 : 45;
    const confidence = Math.round(holdConf * qualifyConf / 100);

    // 3rd-place placement depends on the global ranking + FIFA's assignment table,
    // so it's only "locked" once every group has finished (the 8 best are then fixed).
    assignments.set(slot.matchNo, { team: best.team, confidence: allComplete ? 100 : confidence, locked: allComplete });
    usedGroups.add(best.group);
  }

  return assignments;
}

// ── Unified bracket resolver ─────────────────────────────────────────────────────

/** A team that may occupy one side of a match, with its probability and lock status. */
type TeamProb = { team: string; prob: number; locked: boolean };

export interface BracketMatch {
  matchNo: number;
  round: number;  // 32, 16, 8, 4 (SF), 3 (3rd place), 2 (Final)
  teams: string;  // FIFA feeder string, e.g. "1D vs. 3BEFIJ" or "W74 vs. W77"
}

const TBD: TeamProb[] = [{ team: "TBD", prob: 1, locked: false }];

/** Split "X vs. Y" into its two feeder tokens. */
function parseFeeders(teams: string): [string, string] {
  const parts = teams.split(/\s+vs\.?\s+/i).map(s => s.trim());
  return [parts[0] ?? "", parts[1] ?? ""];
}

/** Merge duplicate teams, sort by probability, cap the list, and renormalise to sum 1. */
function mergeCapNormalise(list: TeamProb[], cap = 8): TeamProb[] {
  const m = new Map<string, { prob: number; locked: boolean }>();
  for (const t of list) {
    const e = m.get(t.team);
    if (e) { e.prob += t.prob; e.locked = e.locked || t.locked; }
    else m.set(t.team, { prob: t.prob, locked: t.locked });
  }
  let arr = [...m.entries()].map(([team, v]) => ({ team, prob: v.prob, locked: v.locked }));
  arr.sort((a, b) => b.prob - a.prob);
  if (arr.length > cap) arr = arr.slice(0, cap);
  const sum = arr.reduce((s, t) => s + t.prob, 0) || 1;
  return arr.map(t => ({ ...t, prob: t.prob / sum }));
}

/**
 * Winner/loser candidates of an undecided match: each side normalised to 0.5 so the two
 * sides contribute equally ("balanced until they play"). Once a match is played, callers
 * substitute the real winner/loser instead.
 */
function balancedOutcome(s1: TeamProb[], s2: TeamProb[]): TeamProb[] {
  const half = (s: TeamProb[]) => {
    const sum = s.reduce((a, t) => a + t.prob, 0) || 1;
    return s.map(t => ({ team: t.team, prob: (t.prob / sum) * 0.5, locked: false }));
  };
  return mergeCapNormalise([...half(s1), ...half(s2)]);
}

/**
 * Candidate teams for a 3rd-place slot like "3BEFIJ": the current 3rd-placed team of each
 * eligible group, ranked by current standing, weighted by their likelihood of qualifying as
 * a top-8 third. The team picked by the global assignment is pinned first (the projection);
 * the rest are shown as realistic alternative opponents. Once every group is complete the
 * placement is fixed, so only the locked team is returned.
 */
function thirdPlaceCandidates(
  groups: string[],
  map: Map<string, GroupStanding>,
  assignment: SlotResult | undefined,
): TeamProb[] {
  if (!assignment) return TBD;
  if (assignment.locked) return [{ team: assignment.team, prob: 1, locked: true }];

  const qualWeight = (pts: number) => (pts >= 4 ? 85 : pts >= 3 ? 70 : pts >= 1 ? 50 : 25);
  type Cand = { team: string; w: number; pts: number; gd: number; gf: number };
  const list: Cand[] = [];
  for (const g of groups) {
    const gs = map.get(g);
    if (!gs || gs.teams.length < 3) continue;
    const t = gs.teams[2];
    list.push({ team: norm(t.name), w: qualWeight(t.points), pts: t.points, gd: t.gd, gf: t.gf });
  }
  if (list.length === 0) return [{ team: assignment.team, prob: assignment.confidence / 100, locked: false }];

  list.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  // Pin the assigned team first with a guaranteed-highest weight (it's the projection)
  let assigned = list.find(c => c.team === assignment.team);
  if (!assigned) { assigned = { team: assignment.team, w: 0, pts: 0, gd: 0, gf: 0 }; list.push(assigned); }
  const maxOther = Math.max(0, ...list.filter(c => c !== assigned).map(c => c.w));
  assigned.w = Math.max(assigned.w, maxOther) + 1;

  const ordered = [assigned, ...list.filter(c => c !== assigned)];
  const sum = ordered.reduce((s, c) => s + c.w, 0) || 1;
  return ordered.map(c => ({ team: c.team, prob: c.w / sum, locked: false }));
}

/**
 * Compute predictions for every knockout match (R32 → Final) from live group standings,
 * the parsed bracket, and any completed knockout results. Processed in match order so each
 * "W##"/"L##" feeder is already resolved before it's referenced.
 */
export function computeKnockoutPredictions(
  standings: GroupStanding[],
  bracket: BracketMatch[],
  results: KnockoutResult[] = [],
): KnockoutPrediction[] {
  const map = new Map(standings.map(gs => [gs.group, gs]));

  // 3rd-place slots come straight from the bracket's "3XXXX" tokens (eligible groups encoded inline)
  const thirdSlots: { matchNo: number; groups: string[] }[] = [];
  for (const b of bracket) {
    for (const tok of parseFeeders(b.teams)) {
      if (/^3[A-L]+$/.test(tok)) thirdSlots.push({ matchNo: b.matchNo, groups: tok.slice(1).split("") });
    }
  }
  const thirdAssignments = computeThirdPlaceAssignments(map, thirdSlots);

  // Completed knockout games indexed by unordered team pair
  const pairResult = new Map<string, { winner: string; loser: string }>();
  for (const r of results) {
    pairResult.set(h2hKey(norm(r.teamA), norm(r.teamB)), { winner: norm(r.winner), loser: norm(r.loser) });
  }

  const winners = new Map<number, TeamProb[]>();
  const losers = new Map<number, TeamProb[]>();
  const predictions: KnockoutPrediction[] = [];

  const resolveToken = (tok: string, matchNo: number): TeamProb[] => {
    if (/^[12][A-L]$/.test(tok)) {
      const r = resolveDirectSlot(tok, map);
      return [{ team: r.team, prob: r.confidence / 100, locked: r.locked }];
    }
    if (/^3[A-L]+$/.test(tok)) {
      return thirdPlaceCandidates(tok.slice(1).split(""), map, thirdAssignments.get(matchNo));
    }
    const w = /^W(\d+)$/.exec(tok);
    if (w) return winners.get(parseInt(w[1])) ?? TBD;
    const l = /^L(\d+)$/.exec(tok);
    if (l) return losers.get(parseInt(l[1])) ?? TBD;
    return TBD;
  };

  for (const b of [...bracket].sort((a, b) => a.matchNo - b.matchNo)) {
    const [tok1, tok2] = parseFeeders(b.teams);
    const s1 = resolveToken(tok1, b.matchNo);
    const s2 = resolveToken(tok2, b.matchNo);

    // Build display matchups: every team1 × team2 combination, most likely first
    let matchups: MatchupOption[] = [];
    for (const x of s1) {
      for (const y of s2) {
        matchups.push({
          team1: x.team, team2: y.team, probability: x.prob * y.prob,
          team1Locked: x.locked, team2Locked: y.locked,
        });
      }
    }
    matchups.sort((a, b) => b.probability - a.probability);
    matchups = matchups.slice(0, 6).map(m => ({ ...m, probability: Math.max(1, Math.round(m.probability * 100)) }));
    predictions.push({ matchNo: b.matchNo, matchups });

    // Resolve this match's winner/loser for downstream feeders
    const a = s1[0]?.team, c = s2[0]?.team;
    const pr = a && c ? pairResult.get(h2hKey(a, c)) : undefined;
    if (pr) {
      winners.set(b.matchNo, [{ team: pr.winner, prob: 1, locked: true }]);
      losers.set(b.matchNo, [{ team: pr.loser, prob: 1, locked: true }]);
    } else {
      const outcome = balancedOutcome(s1, s2);
      winners.set(b.matchNo, outcome);
      losers.set(b.matchNo, outcome);
    }
  }

  return predictions;
}
