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
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            FIFA World Cup 2026 Ticket Prices
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            The largest FIFA World Cup ever is coming to the US, Canada &amp;
            Mexico. Compare ticket prices across resale markets for all 104
            matches.
          </p>
        </div>
      </header>

      {/* Stats banner */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex flex-wrap items-center gap-y-0.5 text-xs sm:text-sm">
          <div>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {matches.length}
            </span>{" "}
            <span className="text-emerald-600 dark:text-emerald-500">
              matches across 16 cities
            </span>
          </div>
          <span className="mx-2 sm:mx-3 text-emerald-300 dark:text-emerald-700">|</span>
          <div>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {tickets.filter((t) => t.floorPrice).length}
            </span>{" "}
            <span className="text-emerald-600 dark:text-emerald-500">
              live prices
            </span>
          </div>
          <span className="mx-2 sm:mx-3 text-emerald-300 dark:text-emerald-700">|</span>
          <a
            href="https://collect.fifa.com/pages/right-to-tickets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            From{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              FIFA Collect
            </span>{" "}
            &amp; more
          </a>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
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

      {/* FIFA Resale closure notice — compact ticker */}
      <div className="bg-amber-50/80 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/40">
        <div className="max-w-7xl mx-auto px-4 py-1 overflow-x-auto whitespace-nowrap text-[10px] sm:text-xs text-amber-600 dark:text-amber-500">
          FIFA official resale{" "}
          <span className="font-semibold">closed Feb 22 &ndash; Apr 8</span>{" · "}
          <a
            href="https://collect.fifa.com/marketplace?ref=serfifathekick"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-amber-700 dark:hover:text-amber-400"
          >
            FIFA Collect
          </a>{" "}
          is the only way to buy &amp; sell during this window
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500">
          <div>
            <p className="font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              About FIFA Collect
            </p>
            <p>
              FIFA Collect is a digital collectibles marketplace where fans can
              buy, sell, and trade FIFA World Cup 2026 tickets. All purchases on
              FIFA Collect are final and non-refundable. A 15% resale fee
              applies to secondary market sales. For full details on how the
              platform works, fees, and policies, visit the{" "}
              <a
                href="https://collect.fifa.com/learn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                FIFA Collect FAQ
              </a>
              .
            </p>
          </div>

          <div>
            <p className="font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              Disclaimer
            </p>
            <p>
              WC26 Ticket Prices is an independent price comparison tool and is not
              affiliated with, endorsed by, or connected to FIFA, FIFA Collect,
              or any official FIFA entity. All ticket prices displayed are
              sourced from publicly available data and are provided for
              informational purposes only. We make no guarantees regarding the
              accuracy, completeness, or timeliness of pricing information.
              WC26 Ticket Prices shall not be held liable for any losses, damages, or
              issues arising from the use of this site or from transactions made
              on third-party platforms. Users are solely responsible for
              verifying prices and terms before making any purchase.
            </p>
          </div>

          <p>
            Price data from FIFA Collect marketplace. Prices update every 5
            minutes.
          </p>
        </div>
      </footer>
    </div>
  );
}
