import { Suspense } from "react";
import { getTicketsByMatch, getResaleData } from "@/lib/api";
import type { MatchWithPrices } from "@/lib/types";
import { MatchGrid } from "@/components/MatchGrid";

export default async function Home() {
  const [tickets, resaleData] = await Promise.all([
    getTicketsByMatch(),
    getResaleData(),
  ]);

  // Group tickets by match
  const matchMap = new Map<number, MatchWithPrices>();

  for (const ticket of tickets) {
    const key = ticket.match.id;
    if (!matchMap.has(key)) {
      matchMap.set(key, {
        match: ticket.match,
        tickets: [],
        resalePrices: [],
      });
    }
    matchMap.get(key)!.tickets.push(ticket);
  }

  // Attach resale prices
  if (resaleData?.prices) {
    for (const rp of resaleData.prices) {
      const entry = [...matchMap.values()].find(
        (m) => m.match.matchNo === rp.matchNo
      );
      if (entry) {
        entry.resalePrices.push(rp);
      }
    }
  }

  const matches = [...matchMap.values()].sort(
    (a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime()
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            CheapestFIFA
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Compare FIFA World Cup 2026 ticket prices across resale platforms.
            Find the best deals on all 104 matches.
          </p>
        </div>
      </header>

      {/* Stats banner */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {matches.length}
            </span>{" "}
            <span className="text-emerald-600 dark:text-emerald-500">
              matches tracked
            </span>
          </div>
          <div>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {tickets.filter((t) => t.floorPrice).length}
            </span>{" "}
            <span className="text-emerald-600 dark:text-emerald-500">
              listings with prices
            </span>
          </div>
          <div className="text-emerald-600 dark:text-emerald-500">
            Prices from{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              FIFA Collect
            </span>{" "}
            marketplace
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Suspense
          fallback={
            <div className="text-center text-zinc-500 py-12">
              Loading matches...
            </div>
          }
        >
          <MatchGrid matches={matches} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-zinc-400 dark:text-zinc-500">
          <p>
            Price data from FIFA Collect marketplace. Not affiliated with FIFA.
            Prices update every 5 minutes.
          </p>
        </div>
      </footer>
    </div>
  );
}
