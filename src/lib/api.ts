import type { Match, TicketListing, ResaleData } from "./types";

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
  return res.json();
}

export async function getResaleData(): Promise<ResaleData | null> {
  try {
    const data = await import("@/data/resale-prices.json");
    return data.default as ResaleData;
  } catch {
    // No resale data file yet
    return null;
  }
}
