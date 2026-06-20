/**
 * Types for knockout match predictions.
 * Predictions are computed dynamically in src/lib/knockout-bracket.ts
 * from live ESPN group standings — no static data here.
 */

export interface MatchupOption {
  team1: string;
  team2: string;
  probability: number; // % chance this specific matchup occurs
  team1Locked?: boolean; // mathematically guaranteed to finish in this exact group slot
  team2Locked?: boolean;
}

export interface KnockoutPrediction {
  matchNo: number;
  matchups: MatchupOption[]; // sorted by probability desc; matchups[0] is the most likely
}

/** Get aggregate probability for each team appearing in a given match */
export function getTeamAggregates(prediction: KnockoutPrediction): Map<string, number> {
  const agg = new Map<string, number>();
  for (const m of prediction.matchups) {
    agg.set(m.team1, (agg.get(m.team1) ?? 0) + m.probability);
    agg.set(m.team2, (agg.get(m.team2) ?? 0) + m.probability);
  }
  return agg;
}
