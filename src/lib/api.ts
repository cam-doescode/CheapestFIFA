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
  const tickets: TicketListing[] = await res.json();

  // Backfill missing face values from snapshot estimates
  const snapshot = await import("@/data/face-values-snapshot.json");
  for (const ticket of tickets) {
    if (!ticket.faceValue) {
      const fallback = (snapshot.faceValues as Array<{ matchNo: number; category: number; faceValue: number | null; estimated?: boolean }>)
        .find((f) => f.matchNo === ticket.match.matchNo && f.category === ticket.category);
      if (fallback?.faceValue) {
        ticket.faceValue = fallback.faceValue;
        ticket.estimatedFaceValue = true;
      }
    }
  }

  return tickets;
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
