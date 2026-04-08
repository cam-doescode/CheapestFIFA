import type { TicketListing, ResalePrice } from "@/lib/types";
import { formatCurrency, categoryLabel, getCollectUrl } from "@/lib/utils";
import { getRsdFaceValue } from "@/data/rsd-prices";

interface PriceTableProps {
  tickets: TicketListing[];
  resalePrices: ResalePrice[];
  matchNo: number;
  pricingSource?: string;
}

export function PriceTable({ tickets, resalePrices, matchNo, pricingSource = "collect" }: PriceTableProps) {
  if (tickets.length === 0) {
    return <p className="text-sm text-zinc-500 italic">No ticket data available</p>;
  }

  const sortedTickets = [...tickets].sort((a, b) => a.category - b.category);
  const hasMkt = resalePrices.length > 0;

  // Shared class for the divider cell before Collect
  const dividerTh = "text-right py-1 pl-3 sm:pl-4 pr-1 sm:pr-2 font-bold border-l border-zinc-200 dark:border-zinc-700";
  const dividerTd = "py-1 sm:py-1.5 pl-3 sm:pl-4 pr-1 sm:pr-2 text-right font-bold border-l border-zinc-200 dark:border-zinc-700";

  return (
    <>
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
            <th className="text-left py-1 pr-1 sm:pr-2 font-medium">Cat</th>
            <th className="text-right py-1 px-1 sm:px-2 font-medium">{pricingSource === "rsd" ? "RSD Face" : "Face"}</th>
            <th className="text-right py-1 px-1 sm:px-2 font-medium">vs Face</th>
            {hasMkt && (
              <>
                <th className="text-right py-1 px-1 sm:px-2 font-medium">Mkt</th>
                <th className="text-right py-1 px-1 sm:px-2 font-medium">vs Mkt</th>
              </>
            )}
            <th className={dividerTh}>Collect</th>
          </tr>
        </thead>
        <tbody>
          {sortedTickets.map((ticket) => {
            const resale = resalePrices.find((r) => r.category === ticket.category);
            const hasFloor = ticket.floorPrice != null && ticket.floorPrice > 0;
            const faceValue = pricingSource === "rsd"
              ? (getRsdFaceValue(matchNo, ticket.category) ?? ticket.faceValue)
              : ticket.faceValue;
            const isRsdFallback = pricingSource === "rsd" && getRsdFaceValue(matchNo, ticket.category) === null;

            const mktSaving = hasFloor && resale && resale.price > ticket.floorPrice!
              ? Math.round(((resale.price - ticket.floorPrice!) / resale.price) * 100)
              : null;

            return (
              <tr key={ticket.category} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                {/* Cat */}
                <td className="py-1 sm:py-1.5 pr-1 sm:pr-2 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  {categoryLabel(ticket.category)}
                </td>

                {/* Face */}
                <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-right text-zinc-500 dark:text-zinc-400">
                  {formatCurrency(faceValue)}
                  {(ticket.estimatedFaceValue || isRsdFallback) && (
                    <span title={isRsdFallback ? "RSD price unavailable, showing Collect face value" : "Estimated face value"}>*</span>
                  )}
                </td>

                {/* vs Face */}
                <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-right">
                  {hasFloor ? (() => {
                    const multiplier = ticket.floorPrice! / faceValue;
                    if (multiplier <= 1) {
                      return (
                        <span className="relative group/bf text-emerald-600 dark:text-emerald-400 font-semibold cursor-help">
                          &lt; face
                          <span className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover/bf:opacity-100 group-active/bf:opacity-100 transition-opacity z-50">
                            Below face! ({multiplier.toFixed(2)}x)
                          </span>
                        </span>
                      );
                    }
                    return (
                      <span className={
                        multiplier <= 1.5 ? "text-emerald-600 dark:text-emerald-400 font-medium" :
                        multiplier <= 3   ? "text-amber-600 dark:text-amber-400 font-medium" :
                                            "text-red-500 font-medium"
                      }>
                        {multiplier.toFixed(1)}x
                      </span>
                    );
                  })() : <span className="text-zinc-400">--</span>}
                </td>

                {/* Mkt + vs Mkt */}
                {hasMkt && (
                  <>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-right text-zinc-500 dark:text-zinc-400">
                      {resale ? formatCurrency(resale.price) : <span className="text-zinc-400">--</span>}
                    </td>
                    <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-right font-semibold whitespace-nowrap">
                      {mktSaving != null
                        ? <span className="text-emerald-600 dark:text-emerald-400">{mktSaving}% less</span>
                        : <span className="text-zinc-400">--</span>}
                    </td>
                  </>
                )}

                {/* Collect — action column, separated by divider */}
                <td className={dividerTd}>
                  {hasFloor ? (
                    <a href={getCollectUrl(matchNo, ticket.category)} target="_blank" rel="noopener"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 font-bold">
                      {formatCurrency(ticket.floorPrice!)}
                      <svg className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : <span className="text-zinc-400 font-normal">--</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedTickets.some((t) => t.estimatedFaceValue) && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
          *Estimated face value based on similar matches
        </p>
      )}
    </>
  );
}
