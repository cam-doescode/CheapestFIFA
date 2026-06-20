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

/** A group is decided once every team has played all 3 matches. */
function isGroupComplete(gs: GroupStanding): boolean {
  return gs.teams.length > 0 && gs.teams.every(t => t.gamesPlayed >= 3);
}

/**
 * Is the team currently at `pos` (0=winner, 1=runner-up) mathematically guaranteed
 * to finish in exactly that position, regardless of all remaining results?
 *
 * - 1st: their current points already exceed the max any other team could reach.
 * - 2nd: they cannot be caught by 3rd/4th AND cannot themselves catch 1st.
 * Strict inequalities are used so ties (decided by tiebreakers) are never treated as locked.
 */
function isDirectSlotLocked(pos: number, gs: GroupStanding): boolean {
  if (gs.teams.length <= pos) return false;
  if (isGroupComplete(gs)) return true; // final standings, order fixed by ESPN rank

  const maxReachable = (t: GroupStanding["teams"][0]) => t.points + 3 * (3 - t.gamesPlayed);
  const team = gs.teams[pos];

  if (pos === 0) {
    // Locked as winner: nobody else can reach their current points
    return gs.teams.every((o, i) => i === 0 || team.points > maxReachable(o));
  }
  if (pos === 1) {
    const leader = gs.teams[0];
    const cantRise = maxReachable(team) < leader.points;            // can never catch 1st
    const cantDrop = gs.teams.slice(2).every(o => team.points > maxReachable(o)); // safe from 3rd/4th
    return cantRise && cantDrop;
  }
  return false;
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
  const locked = isDirectSlotLocked(pos, gs);

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
