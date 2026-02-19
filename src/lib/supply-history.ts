import { kv } from "@vercel/kv";

export interface DailySupply {
  date: string;
  total: number;
  matches: Record<string, number>;
}

export interface SupplyHistory {
  days: DailySupply[];  // newest-first
}

/**
 * Fetch the last N days of supply snapshots from Vercel KV.
 * Returns newest-first. Missing days are omitted.
 * Gracefully returns empty if KV is not configured (local dev).
 */
export async function getSupplyHistory(numDays: number = 5): Promise<SupplyHistory> {
  try {
    const today = new Date();
    const keys: string[] = [];
    const dates: string[] = [];

    for (let i = 0; i < numDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      keys.push(`supply:${dateStr}`);
      dates.push(dateStr);
    }

    // mget fetches all keys in a single round-trip
    const values = await kv.mget<Array<{ total: number; matches: Record<string, number> } | null>>(...keys);

    const days: DailySupply[] = [];
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (val) {
        days.push({ date: dates[i], total: val.total, matches: val.matches });
      }
    }

    return { days };
  } catch {
    // KV not configured (local dev without env vars)
    return { days: [] };
  }
}
