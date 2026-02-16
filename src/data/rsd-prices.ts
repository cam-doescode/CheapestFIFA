/**
 * RSD (Random Selection Draw) face value lookup.
 * Source: @EndlessNinjaFury pricing tracker spreadsheet.
 * Key: "matchNo-category" → face value in USD.
 */
import rsdSnapshot from "./face-values-rsd-snapshot.json";

export type RsdLookup = Map<string, number>;

function buildLookup(): RsdLookup {
  const map = new Map<string, number>();
  for (const entry of rsdSnapshot.faceValues) {
    map.set(`${entry.matchNo}-${entry.category}`, entry.faceValue);
  }
  return map;
}

export const RSD_PRICES: RsdLookup = buildLookup();

/** Get RSD face value for a match+category, or null if not found */
export function getRsdFaceValue(matchNo: number, category: number): number | null {
  return RSD_PRICES.get(`${matchNo}-${category}`) ?? null;
}
