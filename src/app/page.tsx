import { Suspense } from "react";
import { getTicketsByMatch, getResaleData, getGroupStandings, getKnockoutResults } from "@/lib/api";
import { computeKnockoutPredictions, type BracketMatch } from "@/lib/knockout-bracket";
import type { MatchWithPrices } from "@/lib/types";
import type { KnockoutPrediction } from "@/data/knockout-predictions";
import { withReferral } from "@/lib/utils";
import { MatchGrid } from "@/components/MatchGrid";
import { GeoBanner } from "@/components/GeoBanner";
import { PaymentBanner } from "@/components/PaymentBanner";

export default async function Home() {
  const [tickets, resaleData, standings, koResults] = await Promise.all([
    getTicketsByMatch(),
    getResaleData(),
    getGroupStandings(),
    getKnockoutResults(),
  ]);

  // Parse the knockout bracket structure straight from the FIFA feeder strings
  const bracketByNo = new Map<number, BracketMatch>();
  for (const t of tickets) {
    const m = t.match;
    if ([32, 16, 8, 4, 3, 2].includes(m.round) && !bracketByNo.has(m.matchNo)) {
      bracketByNo.set(m.matchNo, { matchNo: m.matchNo, round: m.round, teams: m.teams });
    }
  }

  // Resolve every knockout round from live standings + results
  const predictions = computeKnockoutPredictions(standings, [...bracketByNo.values()], koResults);
  const knockoutPredictions = new Map<number, KnockoutPrediction>(
    predictions.map(p => [p.matchNo, p])
  );

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

  // Average % cheaper Collect vs Marketplace (only where Collect < Mkt)
  const mktDiscounts: number[] = [];
  for (const m of matches) {
    for (const t of m.tickets) {
      if (!t.floorPrice || t.floorPrice <= 0) continue;
      const mkt = m.resalePrices.find(r => r.category === t.category);
      if (!mkt || mkt.price <= t.floorPrice) continue;
      mktDiscounts.push((mkt.price - t.floorPrice) / mkt.price * 100);
    }
  }
  const avgMktDiscount = mktDiscounts.length > 0
    ? Math.round(mktDiscounts.reduce((a, b) => a + b, 0) / mktDiscounts.length)
    : null;

  const mktRefreshedAt = resaleData?.lastScraped
    ? new Date(resaleData.lastScraped).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

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
          {avgMktDiscount != null && (
            <>
              <span className="mx-2 sm:mx-3 text-emerald-300 dark:text-emerald-700">|</span>
              <a href={withReferral("https://collect.fifa.com/marketplace")} target="_blank" rel="noopener" className="hover:underline">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  ~{avgMktDiscount}% cheaper
                </span>{" "}
                <span className="text-emerald-600 dark:text-emerald-500">
                  than FIFA Marketplace
                </span>
              </a>
            </>
          )}
          <span className="mx-2 sm:mx-3 text-emerald-300 dark:text-emerald-700">|</span>
          <a
            href={withReferral("https://collect.fifa.com/pages/right-to-tickets")}
            target="_blank"
            rel="noopener"
            className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline transition-colors"
          >
            From{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              FIFA Collect
            </span>{" "}
            &amp; more
          </a>
        </div>
      </div>

      {/* Payment methods banner */}
      <Suspense fallback={null}>
        <PaymentBanner />
      </Suspense>

      {/* Geo-detection banner */}
      <Suspense fallback={null}>
        <GeoBanner />
      </Suspense>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <Suspense
          fallback={
            <div className="text-center text-zinc-500 py-12">
              Loading matches...
            </div>
          }
        >
          <MatchGrid matches={matches} knockoutPredictions={knockoutPredictions} />
        </Suspense>
      </main>

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
                href={withReferral("https://collect.fifa.com/learn")}
                target="_blank"
                rel="noopener"
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
            FIFA Collect prices update every 5 minutes.
            {mktRefreshedAt && (
              <> FIFA Marketplace prices last refreshed <span className="font-medium text-zinc-500 dark:text-zinc-400">{mktRefreshedAt}</span>.</>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
