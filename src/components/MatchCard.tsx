import Image from "next/image";
import type { MatchWithPrices } from "@/lib/types";
import { formatDate, formatTime, getCollectUrl, parseTeams, getFlagUrl } from "@/lib/utils";
import { PriceTable } from "./PriceTable";

interface MatchCardProps {
  data: MatchWithPrices;
}

function TeamNames({ teams }: { teams: string }) {
  const parsed = parseTeams(teams);
  if (parsed.length !== 2) return <>{teams}</>;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <TeamWithFlag name={parsed[0]} />
      <span className="text-zinc-400 dark:text-zinc-500 font-normal mx-0.5">vs.</span>
      <TeamWithFlag name={parsed[1]} />
    </span>
  );
}

function TeamWithFlag({ name }: { name: string }) {
  const flagUrl = getFlagUrl(name);
  return (
    <span className="inline-flex items-center gap-1">
      {flagUrl && (
        <Image
          src={flagUrl}
          alt={`${name} flag`}
          width={20}
          height={15}
          className="inline-block rounded-sm"
          unoptimized
        />
      )}
      {name}
    </span>
  );
}

export function MatchCard({ data }: MatchCardProps) {
  const { match, tickets, resalePrices } = data;

  const cheapestFloor = tickets
    .filter((t) => t.floorPrice != null && t.floorPrice > 0)
    .sort((a, b) => a.floorPrice! - b.floorPrice!)[0];

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:shadow-md transition-shadow flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
            {match.roundInfo} &middot; Match {match.matchNo}
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-tight">
            <TeamNames teams={match.teams} />
          </h3>
        </div>
        {cheapestFloor && (
          <div className="text-right ml-3 shrink-0">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">From</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${Math.round(cheapestFloor.floorPrice!)}
            </div>
          </div>
        )}
      </div>

      {/* Match details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        <span>{formatDate(match.date)}</span>
        <span>{formatTime(match.date)}</span>
        <span>
          {match.stadium}, {match.city}
        </span>
      </div>

      {/* Price table */}
      <PriceTable tickets={tickets} resalePrices={resalePrices} matchNo={match.matchNo} />

      {/* Buy CTA — links to cheapest available category */}
      {cheapestFloor && (
        <a
          href={getCollectUrl(match.matchNo, cheapestFloor.category)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-3 block w-full text-center text-sm font-medium py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          Buy on FIFA Collect &rarr;
        </a>
      )}
    </div>
  );
}
