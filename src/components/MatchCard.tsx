"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { MatchWithPrices } from "@/lib/types";
import type { KnockoutPrediction } from "@/data/knockout-predictions";
import { getTeamAggregates } from "@/data/knockout-predictions";
import { formatDate, formatTime, getCollectUrl, parseTeams, getFlagUrl, getStadiumMapPath } from "@/lib/utils";
import { getRsdFaceValue } from "@/data/rsd-prices";
import { PriceTable } from "./PriceTable";
import { StadiumMapModal } from "./StadiumMapModal";

interface MatchCardProps {
  data: MatchWithPrices;
  prediction?: KnockoutPrediction;
  pricingSource?: string;
  feesOn?: boolean;
  salePct?: number;
  now?: number;
}

// RTTs can be converted/traded only up until 3 days before match day.
// https://collect.fifa.com/pages/right-to-tickets
const RTT_CUTOFF_MS = 3 * 24 * 60 * 60 * 1000;
const RTT_URGENT_MS = 48 * 60 * 60 * 1000;  // bouncing "buy now" within 2 days of the deadline
const RTT_SOON_MS = 6 * 24 * 60 * 60 * 1000; // soft heads-up within 6 days of the deadline

type RttState = { tier: "urgent" | "soon"; msLeft: number };

// Matches inside the closed window are filtered out of the grid entirely, so here we
// only flag the run-up to the deadline.
function getRttState(matchDate: string, now: number): RttState | null {
  const msLeft = new Date(matchDate).getTime() - RTT_CUTOFF_MS - now;
  if (msLeft <= 0) return null;
  if (msLeft <= RTT_URGENT_MS) return { tier: "urgent", msLeft };
  if (msLeft <= RTT_SOON_MS) return { tier: "soon", msLeft };
  return null;
}

function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function TeamNames({ teams, team1Locked, team2Locked }: { teams: string; team1Locked?: boolean; team2Locked?: boolean }) {
  const parsed = parseTeams(teams);
  if (parsed.length !== 2) return <>{teams}</>;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <TeamWithFlag name={parsed[0]} locked={team1Locked} />
      <span className="text-zinc-400 dark:text-zinc-500 font-normal mx-0.5">vs.</span>
      <TeamWithFlag name={parsed[1]} locked={team2Locked} />
    </span>
  );
}

function TeamWithFlag({ name, locked }: { name: string; locked?: boolean }) {
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
      {locked && (
        <span
          title="Qualified — mathematically guaranteed this group position"
          className="text-emerald-600 dark:text-emerald-400 not-italic cursor-help"
          aria-label="Qualified for this position"
        >
          🔒
        </span>
      )}
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

  const lockedTeams = [
    top.team1Locked ? top.team1 : null,
    top.team2Locked ? top.team2 : null,
  ].filter((t): t is string => !!t);

  // When exactly one side is locked, list the realistic opponents for the open slot,
  // ranked by likelihood (aggregated across all matchups).
  const oneLocked = !!top.team1Locked !== !!top.team2Locked;
  const lockedFirst = !!top.team1Locked;
  const opponents = (() => {
    if (!oneLocked) return [] as Array<[string, number]>;
    const m = new Map<string, number>();
    for (const mu of prediction.matchups) {
      const opp = lockedFirst ? mu.team2 : mu.team1;
      m.set(opp, (m.get(opp) ?? 0) + mu.probability);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();

  // Only show the interactive tooltip when there's something to explain
  const hasTooltip = alternatives.length > 0 || lockedTeams.length > 0;

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

  const badgeClasses =
    "ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 normal-case tracking-normal";

  if (!hasTooltip) {
    return <span className={badgeClasses}>{top.probability}% likely</span>;
  }

  return (
    <span ref={ref} className="relative group/pred">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${badgeClasses} cursor-help focus:outline-none`}
      >
        {top.probability}% likely
      </button>
      <span
        className={`absolute top-full left-0 mt-1 min-w-[240px] w-max max-w-[300px] px-3 py-2.5 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] sm:text-xs leading-snug z-50 shadow-lg transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none group-hover/pred:opacity-100 group-hover/pred:pointer-events-auto"
        }`}
      >
        {lockedTeams.length > 0 && (
          <div className="mb-1.5">
            <div className="font-semibold text-emerald-300 mb-0.5">Qualified for this slot</div>
            {lockedTeams.map((t) => (
              <div key={t} className="flex items-center gap-1 py-0.5">
                <span>🔒</span>
                <span>{t}</span>
                <span className="text-emerald-400 ml-auto shrink-0">guaranteed</span>
              </div>
            ))}
          </div>
        )}
        {oneLocked && opponents.length > 0 ? (
          <>
            <div className="font-semibold mb-1.5 text-purple-300">Likely opponents (current standing)</div>
            {opponents.map(([team, pct]) => (
              <div key={team} className="flex justify-between gap-3 py-0.5">
                <span>{team}</span>
                <span className="text-purple-300 font-medium shrink-0">{pct}%</span>
              </div>
            ))}
          </>
        ) : alternatives.length > 0 ? (
          <>
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
          </>
        ) : null}
      </span>
    </span>
  );
}

const MKT_FEE = 1.15;
const COLLECT_FEE = 1.03;

export function MatchCard({ data, prediction, pricingSource = "collect", feesOn = true, salePct = 0, now = Date.now() }: MatchCardProps) {
  const { match, tickets, resalePrices } = data;

  // Only flag urgency when there's actually something to buy
  const hasListings = tickets.some((t) => t.floorPrice != null && t.floorPrice > 0);
  const rtt = hasListings ? getRttState(match.date, now) : null;

  const cheapestFloor = tickets
    .filter((t) => t.floorPrice != null && t.floorPrice > 0)
    .sort((a, b) => a.floorPrice! - b.floorPrice!)[0];

  // Resolve face value based on pricing toggle
  const cheapestFaceValue = cheapestFloor
    ? (pricingSource === "rsd"
        ? (getRsdFaceValue(match.matchNo, cheapestFloor.category) ?? cheapestFloor.faceValue)
        : cheapestFloor.faceValue)
    : 0;

  const isBelowFace = cheapestFaceValue > 0 && cheapestFloor && cheapestFloor.floorPrice! <= cheapestFaceValue;

  // Best saving vs FIFA Marketplace across all categories
  const bestMktSaving = tickets.reduce<{ pct: number; dollars: number; category: number } | null>((best, t) => {
    if (!t.floorPrice || t.floorPrice <= 0) return best;
    const mkt = resalePrices.find(r => r.category === t.category);
    if (!mkt) return best;
    const effectiveMkt = mkt.price * (feesOn ? MKT_FEE : 1);
    const effectiveCollect = t.floorPrice * (1 - salePct / 100) * (feesOn ? COLLECT_FEE : 1);
    if (effectiveMkt <= effectiveCollect) return best;
    const pct = Math.round(((effectiveMkt - effectiveCollect) / effectiveMkt) * 100);
    const dollars = Math.round(effectiveMkt - effectiveCollect);
    if (!best || pct > best.pct) return { pct, dollars, category: t.category };
    return best;
  }, null);

  // Activity proof
  const totalSold = tickets.reduce((sum, t) => sum + (t.saleTransactions || 0), 0);
  const lastSaleTicket = tickets
    .filter(t => t.lastSaleDate)
    .sort((a, b) => new Date(b.lastSaleDate!).getTime() - new Date(a.lastSaleDate!).getTime())[0];

  // Use predicted teams when available (top matchup)
  const topMatchup = prediction?.matchups[0];
  const displayTeams = topMatchup
    ? `${topMatchup.team1} vs. ${topMatchup.team2}`
    : match.teams;
  // A knockout matchup is "confirmed" once both teams are mathematically/actually determined
  const confirmed = !!topMatchup && !!topMatchup.team1Locked && !!topMatchup.team2Locked;

  return (
    <div className={`rounded-xl border p-3 sm:p-4 hover:shadow-md transition-shadow flex flex-col bg-white dark:bg-zinc-900 ${
      rtt?.tier === "urgent"
        ? "border-red-400 dark:border-red-600 animate-urgent-glow"
        : prediction
        ? "border-purple-300 dark:border-purple-800"
        : "border-zinc-200 dark:border-zinc-800"
    }`}>
      {/* RTT conversion-deadline urgency */}
      {rtt && (
        <a
          href={getCollectUrl(match.matchNo, cheapestFloor?.category)}
          target="_blank"
          rel="noopener"
          className={`mb-2 sm:mb-3 -mx-0.5 px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
            rtt.tier === "urgent"
              ? "bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/70"
              : "bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60"
          }`}
        >
          <span className={`text-base leading-none ${rtt.tier === "urgent" ? "animate-nudge" : ""}`}>
            {rtt.tier === "urgent" ? "⚡" : "⏳"}
          </span>
          <span className={`text-xs font-bold ${rtt.tier === "urgent" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
            {rtt.tier === "urgent" ? "Buy now" : "Buy soon"} — RTT converts close in {formatCountdown(rtt.msLeft)}
          </span>
        </a>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div>
          <div className="text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5 sm:mb-1">
            {match.roundInfo} &middot; Match {match.matchNo}
            {prediction && !confirmed && <PredictionBadge prediction={prediction} />}
          </div>
          <h3 className={`font-semibold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base leading-tight${prediction && !confirmed ? " italic" : ""}`}>
            <TeamNames teams={displayTeams} team1Locked={topMatchup?.team1Locked} team2Locked={topMatchup?.team2Locked} />
          </h3>
          <div className={`text-[9px] sm:text-[10px] mt-0.5 font-normal not-italic ${confirmed ? "text-emerald-600 dark:text-emerald-400" : "text-purple-500 dark:text-purple-400"}`}>
            {confirmed ? <>Confirmed matchup</> : prediction ? <>Projected &middot; {match.teams}</> : <>&nbsp;</>}
          </div>
        </div>
        {cheapestFloor && (
          <div className="text-right ml-3 shrink-0">
            <div className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">From</div>
            <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${Math.round(cheapestFloor.floorPrice!)}
            </div>
            {cheapestFaceValue > 0 && cheapestFloor.floorPrice! <= cheapestFaceValue && (
              <div className="relative group/bf text-[9px] sm:text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 rounded px-1 py-0.5 mt-0.5 cursor-help">
                Below face!
                <span className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover/bf:opacity-100 group-active/bf:opacity-100 transition-opacity z-50">
                  {(cheapestFloor.floorPrice! / cheapestFaceValue).toFixed(2)}x face value
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FIFA Marketplace savings banner */}
      {bestMktSaving && bestMktSaving.pct >= 5 && (
        <a
          href={getCollectUrl(match.matchNo, bestMktSaving.category)}
          target="_blank"
          rel="noopener"
          className="mb-2 sm:mb-3 -mx-0.5 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
        >
          <span className="text-emerald-600 dark:text-emerald-400 text-base leading-none">🏷️</span>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {bestMktSaving.pct}% cheaper than FIFA Marketplace
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-500 ml-auto shrink-0">
            Save ${bestMktSaving.dollars.toLocaleString()}
          </span>
        </a>
      )}

      {/* Match details + supply/activity */}
      <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mb-2 sm:mb-3">
        {/* Left: date & stadium */}
        <div className="space-y-0.5">
          <div>{formatDate(match.date, match.city)} &nbsp; {formatTime(match.date, match.city)}</div>
          <div className="py-0.5">
            <StadiumMapModal
              stadium={match.stadium}
              city={match.city}
              mapSrc={getStadiumMapPath(match.city)}
            />
          </div>
        </div>

        {/* Right: activity */}
        {totalSold > 0 && (
          <div className="text-right text-[10px] sm:text-[11px] shrink-0">
            <div className="text-zinc-400 dark:text-zinc-500 flex items-center justify-end gap-1">
              {lastSaleTicket && isRecentSale(lastSaleTicket.lastSaleDate!) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
              <span>
                <span className="font-medium text-zinc-500 dark:text-zinc-400">{totalSold.toLocaleString()} sold</span>
                {lastSaleTicket?.lastSalePrice && lastSaleTicket.lastSaleDate && (() => {
                  const ago = formatTimeAgo(lastSaleTicket.lastSaleDate);
                  return (
                    <span>
                      {" "}&middot; ${Math.round(lastSaleTicket.lastSalePrice)}{ago ? `, ${ago}` : ""}
                    </span>
                  );
                })()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Price table */}
      <PriceTable tickets={tickets} resalePrices={resalePrices} matchNo={match.matchNo} pricingSource={pricingSource} feesOn={feesOn} salePct={salePct} />

      {/* Buy CTA — links to cheapest available category */}
      {cheapestFloor && (
        <a
          href={getCollectUrl(match.matchNo, cheapestFloor.category)}
          target="_blank"
          rel="noopener"
          className={`mt-auto pt-2 sm:pt-3 block w-full text-center text-xs sm:text-sm font-medium py-1.5 sm:py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors${isBelowFace ? " animate-subtle-pulse" : ""}`}
        >
          Buy from ${Math.round(cheapestFloor.floorPrice!)} on FIFA Collect &rarr;
        </a>
      )}
    </div>
  );
}

function isRecentSale(dateStr: string): boolean {
  const hoursAgo = (Date.now() - new Date(dateStr).getTime()) / 3600000;
  return hoursAgo < 24;
}

function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return "";
}
