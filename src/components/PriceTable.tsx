import type { TicketListing, ResalePrice } from "@/lib/types";
import { formatCurrency, savingsPercent, categoryLabel, getCollectUrl } from "@/lib/utils";

interface PriceTableProps {
  tickets: TicketListing[];
  resalePrices: ResalePrice[];
  matchNo: number;
}

export function PriceTable({ tickets, resalePrices, matchNo }: PriceTableProps) {
  if (tickets.length === 0) {
    return (
      <p className="text-sm text-zinc-500 italic">No ticket data available</p>
    );
  }

  const sortedTickets = [...tickets].sort((a, b) => a.category - b.category);

  return (
  <>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
          <th className="text-left py-1 pr-2 font-medium">Cat</th>
          <th className="text-right py-1 px-2 font-medium">Face</th>
          <th className="text-right py-1 px-2 font-medium">Collect</th>
          {resalePrices.length > 0 && (
            <th className="text-right py-1 px-2 font-medium">Resale</th>
          )}
          <th className="text-right py-1 pl-2 font-medium">vs Face</th>
        </tr>
      </thead>
      <tbody>
        {sortedTickets.map((ticket) => {
          const resale = resalePrices.find(
            (r) => r.category === ticket.category
          );
          const hasFloor = ticket.floorPrice != null && ticket.floorPrice > 0;
          const savings = hasFloor
            ? savingsPercent(ticket.faceValue, ticket.floorPrice!)
            : null;

          return (
            <tr
              key={ticket.category}
              className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            >
              <td className="py-1.5 pr-2 font-medium text-zinc-700 dark:text-zinc-300">
                {categoryLabel(ticket.category)}
              </td>
              <td className="py-1.5 px-2 text-right text-zinc-500 dark:text-zinc-400">
                {formatCurrency(ticket.faceValue)}
                {ticket.estimatedFaceValue && <span title="Estimated face value">*</span>}
              </td>
              <td className="py-1.5 px-2 text-right font-semibold">
                {hasFloor ? (
                  <a
                    href={getCollectUrl(matchNo, ticket.category)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {formatCurrency(ticket.floorPrice!)}
                  </a>
                ) : (
                  <span className="text-zinc-400">--</span>
                )}
              </td>
              {resalePrices.length > 0 && (
                <td className="py-1.5 px-2 text-right">
                  {resale ? (
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(resale.price)}
                    </span>
                  ) : (
                    <span className="text-zinc-400">--</span>
                  )}
                </td>
              )}
              <td className="py-1.5 pl-2 text-right">
                {hasFloor ? (
                  (() => {
                    const multiplier = ticket.floorPrice! / ticket.faceValue;
                    if (multiplier <= 1) {
                      return (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Below face!
                        </span>
                      );
                    }
                    return (
                      <span
                        className={
                          multiplier <= 1.5
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : multiplier <= 3
                              ? "text-amber-600 dark:text-amber-400 font-medium"
                              : "text-red-500 font-medium"
                        }
                      >
                        {multiplier.toFixed(1)}x
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-zinc-400">--</span>
                )}
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
