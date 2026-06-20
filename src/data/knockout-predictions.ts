/**
 * Knockout matchup data for FIFA World Cup 2026.
 *
 * Round of 32 (73–88): confirmed matchups from BBC Sport schedule as of 2026-06-20.
 *   "As it stands" — group stage ends June 27, so a late group result could still shift a slot.
 *   Source: https://www.bbc.com/sport/football/world-cup/schedule#KnockoutStage
 *
 * Round of 16 (89–96): structural bracket only — 4 possible matchups per slot (winner of
 *   each feeding R32 match), each listed at 25% until group stage concludes and we can
 *   weight by actual standings.
 *
 * Quarter-finals and beyond: omitted — too early to predict reliably.
 */

export interface MatchupOption {
  team1: string;
  team2: string;
  probability: number; // percentage
}

export interface KnockoutPrediction {
  matchNo: number;
  matchups: MatchupOption[];
}

export const KNOCKOUT_PREDICTIONS: KnockoutPrediction[] = [
  // ── Round of 32 ──────────────────────────────────────────────────────────────
  // matchNo timing verified against src/data/match-schedule.json (UTC cross-check)

  // 73  Sun 28 Jun 19:00 UTC
  { matchNo: 73, matchups: [{ team1: "South Korea", team2: "Switzerland", probability: 100 }] },
  // 74  Mon 29 Jun 20:30 UTC
  { matchNo: 74, matchups: [{ team1: "Germany", team2: "Scotland", probability: 100 }] },
  // 75  Mon 29 Jun 01:00 UTC (Tue in UTC)
  { matchNo: 75, matchups: [{ team1: "Netherlands", team2: "Morocco", probability: 100 }] },
  // 76  Mon 29 Jun 17:00 UTC
  { matchNo: 76, matchups: [{ team1: "Brazil", team2: "Sweden", probability: 100 }] },
  // 77  Tue 30 Jun 21:00 UTC
  { matchNo: 77, matchups: [{ team1: "Norway", team2: "Japan", probability: 100 }] },
  // 78  Tue 30 Jun 17:00 UTC
  { matchNo: 78, matchups: [{ team1: "Ivory Coast", team2: "France", probability: 100 }] },
  // 79  Tue 30 Jun 01:00 UTC (Wed in UTC) — Mexico vs Spain
  { matchNo: 79, matchups: [{ team1: "Mexico", team2: "Spain", probability: 100 }] },
  // 80  Wed 1 Jul 16:00 UTC
  { matchNo: 80, matchups: [{ team1: "England", team2: "Portugal", probability: 100 }] },
  // 81  Wed 1 Jul 00:00 UTC (Thu in UTC) — USA vs Bosnia
  { matchNo: 81, matchups: [{ team1: "United States", team2: "Bosnia-Herzegovina", probability: 100 }] },
  // 82  Wed 1 Jul 20:00 UTC — New Zealand vs Czech Republic
  { matchNo: 82, matchups: [{ team1: "New Zealand", team2: "Czech Republic", probability: 100 }] },
  // 83  Thu 2 Jul 23:00 UTC — Uruguay vs Austria
  { matchNo: 83, matchups: [{ team1: "Uruguay", team2: "Austria", probability: 100 }] },
  // 84  Thu 2 Jul 19:00 UTC — Congo DR vs Ghana
  { matchNo: 84, matchups: [{ team1: "Congo DR", team2: "Ghana", probability: 100 }] },
  // 85  Thu 2 Jul 03:00 UTC (Fri in UTC) — Canada vs Belgium
  { matchNo: 85, matchups: [{ team1: "Canada", team2: "Belgium", probability: 100 }] },
  // 86  Fri 3 Jul 22:00 UTC — Australia vs Iran
  { matchNo: 86, matchups: [{ team1: "Australia", team2: "Iran", probability: 100 }] },
  // 87  Fri 3 Jul 01:30 UTC (Sat in UTC) — Argentina vs Saudi Arabia
  { matchNo: 87, matchups: [{ team1: "Argentina", team2: "Saudi Arabia", probability: 100 }] },
  // 88  Fri 3 Jul 18:00 UTC — Colombia vs Paraguay
  { matchNo: 88, matchups: [{ team1: "Colombia", team2: "Paraguay", probability: 100 }] },

  // ── Round of 16 ──────────────────────────────────────────────────────────────
  // Each slot is fed by two specific R32 matches → 4 possible team combinations at 25% each.
  // Update probabilities once group stage standings are final (June 27).

  // 89  Sat 4 Jul 21:00 UTC — winner(74: Germany/Scotland) vs winner(77: Norway/Japan)
  { matchNo: 89, matchups: [
    { team1: "Germany", team2: "Norway", probability: 25 },
    { team1: "Germany", team2: "Japan", probability: 25 },
    { team1: "Scotland", team2: "Norway", probability: 25 },
    { team1: "Scotland", team2: "Japan", probability: 25 },
  ]},
  // 90  Sat 4 Jul 17:00 UTC — winner(73: S.Korea/Switzerland) vs winner(75: Netherlands/Morocco)
  { matchNo: 90, matchups: [
    { team1: "Netherlands", team2: "South Korea", probability: 25 },
    { team1: "Netherlands", team2: "Switzerland", probability: 25 },
    { team1: "Morocco", team2: "South Korea", probability: 25 },
    { team1: "Morocco", team2: "Switzerland", probability: 25 },
  ]},
  // 91  Sun 5 Jul 20:00 UTC — winner(76: Brazil/Sweden) vs winner(78: Ivory Coast/France)
  { matchNo: 91, matchups: [
    { team1: "Brazil", team2: "France", probability: 25 },
    { team1: "Brazil", team2: "Ivory Coast", probability: 25 },
    { team1: "Sweden", team2: "France", probability: 25 },
    { team1: "Sweden", team2: "Ivory Coast", probability: 25 },
  ]},
  // 92  Mon 6 Jul 00:00 UTC — winner(79: Mexico/Spain) vs winner(80: England/Portugal)
  { matchNo: 92, matchups: [
    { team1: "Spain", team2: "England", probability: 25 },
    { team1: "Spain", team2: "Portugal", probability: 25 },
    { team1: "Mexico", team2: "England", probability: 25 },
    { team1: "Mexico", team2: "Portugal", probability: 25 },
  ]},
  // 93  Mon 6 Jul 19:00 UTC — winner(84: Congo DR/Ghana) vs winner(83: Uruguay/Austria)
  { matchNo: 93, matchups: [
    { team1: "Uruguay", team2: "Congo DR", probability: 25 },
    { team1: "Uruguay", team2: "Ghana", probability: 25 },
    { team1: "Austria", team2: "Congo DR", probability: 25 },
    { team1: "Austria", team2: "Ghana", probability: 25 },
  ]},
  // 94  Tue 7 Jul 00:00 UTC — winner(81: USA/Bosnia) vs winner(82: New Zealand/Czech Republic)
  { matchNo: 94, matchups: [
    { team1: "United States", team2: "Czech Republic", probability: 25 },
    { team1: "United States", team2: "New Zealand", probability: 25 },
    { team1: "Bosnia-Herzegovina", team2: "Czech Republic", probability: 25 },
    { team1: "Bosnia-Herzegovina", team2: "New Zealand", probability: 25 },
  ]},
  // 95  Tue 7 Jul 16:00 UTC — winner(87: Argentina/Saudi Arabia) vs winner(86: Australia/Iran)
  { matchNo: 95, matchups: [
    { team1: "Argentina", team2: "Australia", probability: 25 },
    { team1: "Argentina", team2: "Iran", probability: 25 },
    { team1: "Saudi Arabia", team2: "Australia", probability: 25 },
    { team1: "Saudi Arabia", team2: "Iran", probability: 25 },
  ]},
  // 96  Tue 7 Jul 20:00 UTC — winner(85: Canada/Belgium) vs winner(88: Colombia/Paraguay)
  { matchNo: 96, matchups: [
    { team1: "Belgium", team2: "Colombia", probability: 25 },
    { team1: "Belgium", team2: "Paraguay", probability: 25 },
    { team1: "Canada", team2: "Colombia", probability: 25 },
    { team1: "Canada", team2: "Paraguay", probability: 25 },
  ]},
];

/** Lookup map: matchNo → prediction */
export const PREDICTIONS_BY_MATCH = new Map<number, KnockoutPrediction>(
  KNOCKOUT_PREDICTIONS.map((p) => [p.matchNo, p])
);

/** Get aggregate probability for each team appearing in a given match */
export function getTeamAggregates(prediction: KnockoutPrediction): Map<string, number> {
  const agg = new Map<string, number>();
  for (const m of prediction.matchups) {
    agg.set(m.team1, (agg.get(m.team1) ?? 0) + m.probability);
    agg.set(m.team2, (agg.get(m.team2) ?? 0) + m.probability);
  }
  return agg;
}
