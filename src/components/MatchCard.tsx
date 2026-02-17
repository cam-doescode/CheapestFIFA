"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { MatchWithPrices } from "@/lib/types";
import type { KnockoutPrediction } from "@/data/knockout-predictions";
import { getTeamAggregates } from "@/data/knockout-predictions";
import { formatDate, formatTime, getCollectUrl, parseTeams, getFlagUrl, getStadiumMapPath } from "@/lib/utils";
import { PriceTable } from "./PriceTable";
import { StadiumMapModal } from "./StadiumMapModal";

interface MatchCardProps {
  data: MatchWithPrices;
  prediction?: KnockoutPrediction;
  pricingSource?: string;
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

function PredictionBadge({ prediction }: { prediction: KnockoutPrediction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const top = prediction.matchups[0];
  const alternatives = prediction.matchups.slice(1);
  const aggregates = getTeamAggregates(prediction);
  const sortedTeams = [...aggregates.entries()].sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative group/pred">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 normal-case tracking-normal cursor-help focus:outline-none"
      >
        {top.probability}% likely
      </button>
      {alternatives.length > 0 && (
        <span
          className={`absolute top-full left-0 mt-1 min-w-[240px] w-max max-w-[300px] px-3 py-2.5 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] sm:text-xs leading-snug z-50 shadow-lg transition-opacity ${
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none group-hover/pred:opacity-100 group-hover/pred:pointer-events-auto"
          }`}
        >
          <div className="font-semibold mb-1.5 text-purple-300">Other possible matchups</div>
          {alternatives.map((alt, i) => (
            <div key={i} className="flex justify-between gap-3 py-0.5">
              <span className="whitespace-nowrap">{alt.team1} vs. {alt.team2}</span>
              <span className="text-purple-300 font-medium shrink-0">{alt.probability}%</span>
            </div>
          ))}
          <div className="border-t border-zinc-600 mt-1.5 pt-1.5 font-semibold text-zinc-300">Team odds for this slot</div>
          {sortedTeams.map(([team, pct]) => (
            <div key={team} className="flex justify-between gap-3 py-0.5">
              <span>{team}</span>
              <span className="text-emerald-400 font-medium shrink-0">{pct.toFixed(1)}%</span>
            </div>
          ))}
        </span>
      )}
    </span>
  );
}

export function MatchCard({ data, prediction, pricingSource = "collect" }: MatchCardProps) {
  const { match, tickets, resalePrices } = data;

  const cheapestFloor = tickets
    .filter((t) => t.floorPrice != null && t.floorPrice > 0)
    .sort((a, b) => a.floorPrice! - b.floorPrice!)[0];

  // Use predicted teams when available (top matchup)
  const topMatchup = prediction?.matchups[0];
  const displayTeams = topMatchup
    ? `${topMatchup.team1} vs. ${topMatchup.team2}`
    : match.teams;

  return (
    <div className={`rounded-xl border p-3 sm:p-4 hover:shadow-md transition-shadow flex flex-col ${
      prediction
        ? "border-purple-300 dark:border-purple-800 bg-white dark:bg-zinc-900"
        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div>
          <div className="text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5 sm:mb-1">
            {match.roundInfo} &middot; Match {match.matchNo}
            {prediction && <PredictionBadge prediction={prediction} />}
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base leading-tight">
            <TeamNames teams={displayTeams} />
          </h3>
        </div>
        {cheapestFloor && (
          <div className="text-right ml-3 shrink-0">
            <div className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">From</div>
            <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${Math.round(cheapestFloor.floorPrice!)}
            </div>
            {cheapestFloor.faceValue > 0 && cheapestFloor.floorPrice! <= cheapestFloor.faceValue && (
              <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 rounded px-1 py-0.5 mt-0.5">
                Below face!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match details */}
      <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mb-2 sm:mb-3 space-y-0.5">
        <div>{formatDate(match.date)} &nbsp; {formatTime(match.date)}</div>
        <div>
          <StadiumMapModal
            stadium={match.stadium}
            city={match.city}
            mapSrc={getStadiumMapPath(match.city)}
          />
        </div>
      </div>

      {/* Supply indicator */}
      {(() => {
        const totalListed = tickets.reduce((sum, t) => sum + (t.circulatingSupply || 0), 0);
        if (totalListed === 0) return null;
        return (
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mb-1.5">
            {totalListed.toLocaleString()} ticket{totalListed !== 1 ? "s" : ""} listed on Collect
          </div>
        );
      })()}

      {/* Price table */}
      <PriceTable tickets={tickets} resalePrices={resalePrices} matchNo={match.matchNo} pricingSource={pricingSource} />

      {/* Buy CTA — links to cheapest available category */}
      {cheapestFloor && (
        <a
          href={getCollectUrl(match.matchNo, cheapestFloor.category)}
          target="_blank"
          rel="noopener"
          className="mt-auto pt-2 sm:pt-3 block w-full text-center text-xs sm:text-sm font-medium py-1.5 sm:py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          Buy from ${Math.round(cheapestFloor.floorPrice!)} on FIFA Collect &rarr;
        </a>
      )}
    </div>
  );
}
