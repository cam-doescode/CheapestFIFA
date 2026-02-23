import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FIFACOLLECT_API = "https://www.fifacollect.info/api";
const COMPETITION_ID = 2;
const SNAPSHOT_TTL = 30 * 86400;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch current ticket data
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
    floorPrice?: number;
  }> = await res.json();

  // Calculate corrected supply (only categories with active listings)
  const matchTotals: Record<string, number> = {};
  let correctedTotal = 0;
  for (const ticket of tickets) {
    if (!ticket.floorPrice || ticket.floorPrice <= 0) continue;
    const matchNo = String(ticket.match.matchNo);
    const supply = ticket.circulatingSupply || 0;
    matchTotals[matchNo] = (matchTotals[matchNo] || 0) + supply;
    correctedTotal += supply;
  }

  // Also calculate the old (wrong) total for the correction ratio
  let oldTotal = 0;
  for (const ticket of tickets) {
    oldTotal += ticket.circulatingSupply || 0;
  }
  const correctionRatio = oldTotal > 0 ? correctedTotal / oldTotal : 1;

  // Update today's snapshot with corrected values
  const today = new Date().toISOString().slice(0, 10);
  const todayKey = `supply:${today}`;
  await kv.set(todayKey, { total: correctedTotal, matches: matchTotals }, { ex: SNAPSHOT_TTL });

  // Fix historical snapshots (last 10 days) by applying the correction ratio
  const fixed: Record<string, { old: number; new: number }> = {};
  fixed[today] = { old: oldTotal, new: correctedTotal };

  for (let i = 1; i <= 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const key = `supply:${dateStr}`;

    const existing = await kv.get<{ total: number; matches: Record<string, number> }>(key);
    if (!existing) continue;

    const oldDayTotal = existing.total;
    const newDayTotal = Math.round(oldDayTotal * correctionRatio);

    // Apply ratio to per-match values too
    const newMatches: Record<string, number> = {};
    for (const [mn, val] of Object.entries(existing.matches)) {
      newMatches[mn] = Math.round(val * correctionRatio);
    }

    await kv.set(key, { total: newDayTotal, matches: newMatches }, { ex: SNAPSHOT_TTL });
    fixed[dateStr] = { old: oldDayTotal, new: newDayTotal };
  }

  return NextResponse.json({
    ok: true,
    correctionRatio: correctionRatio.toFixed(6),
    today: { total: correctedTotal, matchCount: Object.keys(matchTotals).length },
    fixed,
  });
}
