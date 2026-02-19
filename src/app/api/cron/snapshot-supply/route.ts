import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FIFACOLLECT_API = "https://www.fifacollect.info/api";
const COMPETITION_ID = 2;
const SNAPSHOT_TTL = 30 * 86400; // 30 days in seconds

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch fresh ticket data (bypass Next.js cache)
  const res = await fetch(
    `${FIFACOLLECT_API}/matches/GetTicketsByMatch?competitionId=${COMPETITION_ID}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "API fetch failed" }, { status: 502 });
  }

  const tickets: Array<{
    match: { matchNo: number };
    circulatingSupply: number;
  }> = await res.json();

  // Aggregate: total + per-match supply
  const matchTotals: Record<string, number> = {};
  let total = 0;
  for (const ticket of tickets) {
    const matchNo = String(ticket.match.matchNo);
    const supply = ticket.circulatingSupply || 0;
    matchTotals[matchNo] = (matchTotals[matchNo] || 0) + supply;
    total += supply;
  }

  // Store in KV with 30-day TTL
  const today = new Date().toISOString().slice(0, 10);
  const key = `supply:${today}`;
  await kv.set(key, { total, matches: matchTotals }, { ex: SNAPSHOT_TTL });

  return NextResponse.json({
    ok: true,
    date: today,
    total,
    matchCount: Object.keys(matchTotals).length,
  });
}
