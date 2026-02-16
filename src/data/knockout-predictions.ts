/**
 * Most likely knockout matchup predictions for FIFA World Cup 2026.
 * Source: https://www.2026worldcupsim.com/blog/world-cup-2026-most-likely-knockout-matchups
 * Each entry maps a match number to the most probable teams and their likelihood.
 */

export interface KnockoutPrediction {
  matchNo: number;
  team1: string;
  team2: string;
  probability: number; // percentage, e.g. 36.1
}

export const KNOCKOUT_PREDICTIONS: KnockoutPrediction[] = [
  // Round of 32 (matchNo 73-88)
  { matchNo: 73, team1: "Canada", team2: "Korea Republic", probability: 15.8 },
  { matchNo: 74, team1: "Germany", team2: "Scotland", probability: 13.4 },
  { matchNo: 75, team1: "Morocco", team2: "Netherlands", probability: 30.2 },
  { matchNo: 76, team1: "Brazil", team2: "Japan", probability: 37.4 },
  { matchNo: 77, team1: "France", team2: "Tunisia", probability: 13.6 },
  { matchNo: 78, team1: "Ecuador", team2: "Norway", probability: 20.3 },
  { matchNo: 79, team1: "Mexico", team2: "Saudi Arabia", probability: 9.9 },
  { matchNo: 80, team1: "England", team2: "Uzbekistan", probability: 15.4 },
  { matchNo: 81, team1: "Qatar", team2: "USA", probability: 15.6 },
  { matchNo: 82, team1: "Belgium", team2: "South Africa", probability: 16.9 },
  { matchNo: 83, team1: "Colombia", team2: "Croatia", probability: 23.9 },
  { matchNo: 84, team1: "Austria", team2: "Spain", probability: 33.5 },
  { matchNo: 85, team1: "Egypt", team2: "Switzerland", probability: 15.9 },
  { matchNo: 86, team1: "Argentina", team2: "Uruguay", probability: 38.1 },
  { matchNo: 87, team1: "Panama", team2: "Portugal", probability: 12.3 },
  { matchNo: 88, team1: "Australia", team2: "IR Iran", probability: 16.2 },

  // Round of 16 (matchNo 89-96)
  { matchNo: 89, team1: "France", team2: "Germany", probability: 36.1 },
  { matchNo: 90, team1: "Mexico", team2: "Netherlands", probability: 11.0 },
  { matchNo: 91, team1: "Brazil", team2: "Norway", probability: 14.7 },
  { matchNo: 92, team1: "England", team2: "Mexico", probability: 15.2 },
  { matchNo: 93, team1: "Croatia", team2: "Spain", probability: 12.2 },
  { matchNo: 94, team1: "Belgium", team2: "USA", probability: 25.4 },
  { matchNo: 95, team1: "Argentina", team2: "IR Iran", probability: 12.3 },
  { matchNo: 96, team1: "Portugal", team2: "Switzerland", probability: 18.7 },
];

/** Lookup map: matchNo → prediction */
export const PREDICTIONS_BY_MATCH = new Map<number, KnockoutPrediction>(
  KNOCKOUT_PREDICTIONS.map((p) => [p.matchNo, p])
);
