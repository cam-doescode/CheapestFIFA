/**
 * Dynamic knockout predictions derived from live group standings.
 *
 * R32 bracket slots come directly from the FIFA API (match.teams on round=32 matches),
 * e.g. "2A vs. 2B", "1E vs. 3ABCDF". Group standings are fetched from ESPN's public API
 * and refreshed every 5 minutes alongside ticket prices.
 *
 * Probability = how likely this specific matchup occurs (both teams stay in their slot).
 * Confidence per slot = function of points lead + games remaining.
 */

import type { GroupStanding } from "@/lib/api";
import type { KnockoutPrediction } from "@/data/knockout-predictions";

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

// ── Fixed R32 bracket (from FIFA API round=32 match.teams field) ───────────────
// Slot codes: "1A" = winner of Group A, "2B" = runner-up of Group B,
// "3ABCDF" = best 3rd-place team from groups A, B, C, D, or F.
const R32_BRACKET: { matchNo: number; slot1: string; slot2: string }[] = [
  { matchNo: 73, slot1: "2A",      slot2: "2B"      },
  { matchNo: 74, slot1: "1E",      slot2: "3ABCDF"  },
  { matchNo: 75, slot1: "1F",      slot2: "2C"      },
  { matchNo: 76, slot1: "1C",      slot2: "2F"      },
  { matchNo: 77, slot1: "1I",      slot2: "3CDFGH"  },
  { matchNo: 78, slot1: "2E",      slot2: "2I"      },
  { matchNo: 79, slot1: "1A",      slot2: "3CEFHI"  },
  { matchNo: 80, slot1: "1L",      slot2: "3EHIJK"  },
  { matchNo: 81, slot1: "1D",      slot2: "3BEFIJ"  },
  { matchNo: 82, slot1: "1G",      slot2: "3AEHIJ"  },
  { matchNo: 83, slot1: "2K",      slot2: "2L"      },
  { matchNo: 84, slot1: "1H",      slot2: "2J"      },
  { matchNo: 85, slot1: "1B",      slot2: "3EFGIJ"  },
  { matchNo: 86, slot1: "1J",      slot2: "2H"      },
  { matchNo: 87, slot1: "1K",      slot2: "3DEIJL"  },
  { matchNo: 88, slot1: "2D",      slot2: "2G"      },
];

// ── Fixed R16 bracket (which R32 match winners feed into each R16 slot) ────────
const R16_BRACKET: { matchNo: number; feeder1: number; feeder2: number }[] = [
  { matchNo: 89, feeder1: 74, feeder2: 77 }, // W-74 vs W-77
  { matchNo: 90, feeder1: 73, feeder2: 75 }, // W-73 vs W-75
  { matchNo: 91, feeder1: 76, feeder2: 78 }, // W-76 vs W-78
  { matchNo: 92, feeder1: 79, feeder2: 80 }, // W-79 vs W-80
  { matchNo: 93, feeder1: 83, feeder2: 84 }, // W-83 vs W-84
  { matchNo: 94, feeder1: 81, feeder2: 82 }, // W-81 vs W-82
  { matchNo: 95, feeder1: 86, feeder2: 88 }, // W-86 vs W-88
  { matchNo: 96, feeder1: 85, feeder2: 87 }, // W-85 vs W-87
];

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
function computeThirdPlaceAssignments(map: Map<string, GroupStanding>): Map<number, SlotResult> {
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

  // The 8 3rd-place slots (matchNo → eligible groups)
  const slots: { matchNo: number; groups: string[] }[] = [
    { matchNo: 74, groups: ["A","B","C","D","F"] },
    { matchNo: 77, groups: ["C","D","F","G","H"] },
    { matchNo: 79, groups: ["C","E","F","H","I"] },
    { matchNo: 80, groups: ["E","H","I","J","K"] },
    { matchNo: 81, groups: ["B","E","F","I","J"] },
    { matchNo: 82, groups: ["A","E","H","I","J"] },
    { matchNo: 85, groups: ["E","F","G","I","J"] },
    { matchNo: 87, groups: ["D","E","I","J","L"] },
  ];

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
    // so it's never treated as "locked" even once a group is complete.
    assignments.set(slot.matchNo, { team: best.team, confidence, locked: false });
    usedGroups.add(best.group);
  }

  return assignments;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function computeR32Predictions(standings: GroupStanding[]): KnockoutPrediction[] {
  const map = new Map(standings.map(gs => [gs.group, gs]));
  const thirdAssignments = computeThirdPlaceAssignments(map);

  return R32_BRACKET.map(({ matchNo, slot1, slot2 }) => {
    const resolve = (slot: string): SlotResult => {
      if (slot.startsWith("3")) return thirdAssignments.get(matchNo) ?? { team: "TBD", confidence: 15, locked: false };
      return resolveDirectSlot(slot, map);
    };

    const r1 = resolve(slot1);
    const r2 = resolve(slot2);
    const probability = Math.max(5, Math.round(r1.confidence * r2.confidence / 100));

    return {
      matchNo,
      matchups: [{
        team1: r1.team, team2: r2.team, probability,
        team1Locked: r1.locked, team2Locked: r2.locked,
      }],
    };
  });
}

export function computeR16Predictions(r32: KnockoutPrediction[]): KnockoutPrediction[] {
  const r32Map = new Map(r32.map(p => [p.matchNo, p]));

  return R16_BRACKET.map(({ matchNo, feeder1, feeder2 }) => {
    const f1 = r32Map.get(feeder1)?.matchups[0];
    const f2 = r32Map.get(feeder2)?.matchups[0];
    const teams1 = f1 ? [f1.team1, f1.team2] : ["TBD", "TBD"];
    const teams2 = f2 ? [f2.team1, f2.team2] : ["TBD", "TBD"];

    // 4 possible matchups (2 possible winners from each R32 feed)
    const matchups = teams1.flatMap(t1 =>
      teams2.map(t2 => ({ team1: t1, team2: t2, probability: 25 }))
    );

    return { matchNo, matchups };
  });
}
