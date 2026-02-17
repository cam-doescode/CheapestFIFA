/**
 * Knockout matchup predictions for FIFA World Cup 2026.
 * Source: https://www.2026worldcupsim.com/blog/world-cup-2026-most-likely-knockout-matchups
 * Based on 1000 simulated tournament runs.
 * Each match slot lists the top 3 most likely matchups.
 */

export interface MatchupOption {
  team1: string;
  team2: string;
  probability: number; // percentage, e.g. 36.1
}

export interface KnockoutPrediction {
  matchNo: number;
  matchups: MatchupOption[]; // sorted by probability desc
}

export const KNOCKOUT_PREDICTIONS: KnockoutPrediction[] = [
  // Round of 32 (matchNo 73-88)
  { matchNo: 73, matchups: [
    { team1: "Canada", team2: "Korea Republic", probability: 15.8 },
    { team1: "Canada", team2: "Mexico", probability: 13.1 },
    { team1: "Korea Republic", team2: "Switzerland", probability: 10.4 },
  ]},
  { matchNo: 74, matchups: [
    { team1: "Germany", team2: "Scotland", probability: 13.4 },
    { team1: "Australia", team2: "Germany", probability: 12.9 },
    { team1: "Germany", team2: "Paraguay", probability: 11.0 },
  ]},
  { matchNo: 75, matchups: [
    { team1: "Morocco", team2: "Netherlands", probability: 30.2 },
    { team1: "Netherlands", team2: "Scotland", probability: 21.7 },
    { team1: "Brazil", team2: "Netherlands", probability: 14.3 },
  ]},
  { matchNo: 76, matchups: [
    { team1: "Brazil", team2: "Japan", probability: 37.4 },
    { team1: "Brazil", team2: "Netherlands", probability: 18.7 },
    { team1: "Brazil", team2: "Tunisia", probability: 10.2 },
  ]},
  { matchNo: 77, matchups: [
    { team1: "France", team2: "Tunisia", probability: 13.6 },
    { team1: "France", team2: "UEFA Playoff B", probability: 7.2 },
    { team1: "France", team2: "Paraguay", probability: 5.7 },
  ]},
  { matchNo: 78, matchups: [
    { team1: "Ecuador", team2: "Norway", probability: 20.3 },
    { team1: "Ecuador", team2: "Senegal", probability: 13.7 },
    { team1: "Ivory Coast", team2: "Norway", probability: 13.0 },
  ]},
  { matchNo: 79, matchups: [
    { team1: "Mexico", team2: "Saudi Arabia", probability: 9.9 },
    { team1: "Ivory Coast", team2: "Mexico", probability: 8.4 },
    { team1: "Ivory Coast", team2: "Korea Republic", probability: 7.1 },
  ]},
  { matchNo: 80, matchups: [
    { team1: "England", team2: "Uzbekistan", probability: 15.4 },
    { team1: "England", team2: "FIFA Playoff 1", probability: 10.2 },
    { team1: "Croatia", team2: "Uzbekistan", probability: 10.0 },
  ]},
  { matchNo: 81, matchups: [
    { team1: "Qatar", team2: "USA", probability: 15.6 },
    { team1: "Canada", team2: "USA", probability: 9.9 },
    { team1: "UEFA Playoff A", team2: "USA", probability: 8.0 },
  ]},
  { matchNo: 82, matchups: [
    { team1: "Belgium", team2: "South Africa", probability: 16.9 },
    { team1: "Belgium", team2: "UEFA Playoff D", probability: 12.1 },
    { team1: "Belgium", team2: "Korea Republic", probability: 8.8 },
  ]},
  { matchNo: 83, matchups: [
    { team1: "Colombia", team2: "Croatia", probability: 23.9 },
    { team1: "Croatia", team2: "Portugal", probability: 21.5 },
    { team1: "Colombia", team2: "England", probability: 17.9 },
  ]},
  { matchNo: 84, matchups: [
    { team1: "Austria", team2: "Spain", probability: 33.5 },
    { team1: "Austria", team2: "Uruguay", probability: 17.8 },
    { team1: "Argentina", team2: "Spain", probability: 16.4 },
  ]},
  { matchNo: 85, matchups: [
    { team1: "Egypt", team2: "Switzerland", probability: 15.9 },
    { team1: "Iran", team2: "Switzerland", probability: 11.3 },
    { team1: "Algeria", team2: "Switzerland", probability: 10.0 },
  ]},
  { matchNo: 86, matchups: [
    { team1: "Argentina", team2: "Uruguay", probability: 38.1 },
    { team1: "Argentina", team2: "Spain", probability: 20.5 },
    { team1: "Austria", team2: "Uruguay", probability: 16.5 },
  ]},
  { matchNo: 87, matchups: [
    { team1: "Panama", team2: "Portugal", probability: 12.3 },
    { team1: "Colombia", team2: "Panama", probability: 11.1 },
    { team1: "Ghana", team2: "Portugal", probability: 10.5 },
  ]},
  { matchNo: 88, matchups: [
    { team1: "Australia", team2: "Iran", probability: 16.2 },
    { team1: "Iran", team2: "Paraguay", probability: 13.9 },
    { team1: "Australia", team2: "Egypt", probability: 10.5 },
  ]},

  // Round of 16 (matchNo 89-96)
  { matchNo: 89, matchups: [
    { team1: "France", team2: "Germany", probability: 36.1 },
    { team1: "Ecuador", team2: "France", probability: 7.8 },
    { team1: "Germany", team2: "Norway", probability: 5.8 },
  ]},
  { matchNo: 90, matchups: [
    { team1: "Mexico", team2: "Netherlands", probability: 11.0 },
    { team1: "Netherlands", team2: "Switzerland", probability: 9.3 },
    { team1: "Korea Republic", team2: "Netherlands", probability: 9.1 },
  ]},
  { matchNo: 91, matchups: [
    { team1: "Brazil", team2: "Norway", probability: 14.7 },
    { team1: "Brazil", team2: "France", probability: 9.7 },
    { team1: "Brazil", team2: "Ecuador", probability: 8.1 },
  ]},
  { matchNo: 92, matchups: [
    { team1: "England", team2: "Mexico", probability: 15.2 },
    { team1: "Croatia", team2: "Mexico", probability: 9.9 },
    { team1: "England", team2: "Korea Republic", probability: 9.5 },
  ]},
  { matchNo: 93, matchups: [
    { team1: "Croatia", team2: "Spain", probability: 12.2 },
    { team1: "England", team2: "Spain", probability: 12.2 },
    { team1: "Portugal", team2: "Spain", probability: 10.9 },
  ]},
  { matchNo: 94, matchups: [
    { team1: "Belgium", team2: "USA", probability: 25.4 },
    { team1: "Iran", team2: "USA", probability: 7.9 },
    { team1: "Belgium", team2: "Paraguay", probability: 4.3 },
  ]},
  { matchNo: 95, matchups: [
    { team1: "Argentina", team2: "Iran", probability: 12.3 },
    { team1: "Argentina", team2: "Belgium", probability: 7.8 },
    { team1: "Iran", team2: "Uruguay", probability: 6.7 },
  ]},
  { matchNo: 96, matchups: [
    { team1: "Portugal", team2: "Switzerland", probability: 18.7 },
    { team1: "Colombia", team2: "Switzerland", probability: 14.4 },
    { team1: "Canada", team2: "Portugal", probability: 5.4 },
  ]},
];

/** Lookup map: matchNo → prediction (with all matchups) */
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
