"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import type { MatchWithPrices } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { MatchFilters } from "./MatchFilters";
import { savingsPercent, parseTeams } from "@/lib/utils";
import { PREDICTIONS_BY_MATCH } from "@/data/knockout-predictions";
import { getRsdFaceValue } from "@/data/rsd-prices";

interface MatchGridProps {
  matches: MatchWithPrices[];
  salePct?: number;
  saleEndsAt?: number | null; // unix ms — when set, discount zeroes out client-side at this time
}

export function MatchGrid({ matches, salePct: initialSalePct, saleEndsAt }: MatchGridProps) {
  const [salePct, setSalePct] = useState(initialSalePct ?? 0);

  // Zero out the discount the moment the countdown expires — no refresh needed
  useEffect(() => {
    if (!saleEndsAt || !initialSalePct) return;
    const ms = saleEndsAt - Date.now();
    if (ms <= 0) { setSalePct(0); return; }
    const id = setTimeout(() => setSalePct(0), ms);
    return () => clearTimeout(id);
  }, [saleEndsAt, initialSalePct]);
  const searchParams = useSearchParams();

  const rounds = (searchParams.get("round") || "").split(",").filter(Boolean);
  const cities = (searchParams.get("city") || "").split(",").filter(Boolean);
  const teams = (searchParams.get("team") || "").split(",").filter(Boolean);
  const matchNos = (searchParams.get("matchNo") || "").split(",").filter(Boolean);
  const sort = searchParams.get("sort") || "mkt-discount";
  const predictorOn = searchParams.get("predictor") !== "off";
  const pricingSource = searchParams.get("pricing") || "collect";
  const feesOn = searchParams.get("fees") !== "off";

  const filtered = useMemo(() => {
    let result = matches;

    if (matchNos.length > 0) {
      const matchNoNums = new Set(matchNos.map((n) => parseInt(n)));
      result = result.filter((m) => matchNoNums.has(m.match.matchNo));
    }

    if (rounds.length > 0) {
      const roundNums = rounds.map((r) => parseInt(r));
      result = result.filter((m) => roundNums.includes(m.match.round));
    }

    if (cities.length > 0) {
      result = result.filter((m) => cities.includes(m.match.city));
    }

    if (teams.length > 0) {
      const teamSet = new Set(teams.map((t) => t.toLowerCase()));
      result = result.filter((m) => {
        // Match on actual team names
        if (parseTeams(m.match.teams).some((t) => teamSet.has(t.toLowerCase()))) {
          return true;
        }
        // When predictor is on, also match on predicted teams
        if (predictorOn) {
          const pred = PREDICTIONS_BY_MATCH.get(m.match.matchNo);
          if (pred && pred.matchups.some((mu) => teamSet.has(mu.team1.toLowerCase()) || teamSet.has(mu.team2.toLowerCase()))) {
            return true;
          }
        }
        return false;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "cheapest": {
          const aMin = getMinFloor(a);
          const bMin = getMinFloor(b);
          return aMin - bMin;
        }
        case "savings": {
          const aSav = getBestSavings(a, pricingSource);
          const bSav = getBestSavings(b, pricingSource);
          return bSav - aSav; // highest savings first
        }
        case "markup": {
          const aMark = getMaxMultiplier(a, pricingSource);
          const bMark = getMaxMultiplier(b, pricingSource);
          return bMark - aMark; // highest markup first
        }
        case "mkt-discount": {
          const aDis = getBestMktDiscount(a, feesOn, salePct);
          const bDis = getBestMktDiscount(b, feesOn, salePct);
          return bDis - aDis;
        }
        case "most-popular": {
          const aSales = getTotalSales(a);
          const bSales = getTotalSales(b);
          return bSales - aSales; // most sold first
        }
        case "match":
          return a.match.matchNo - b.match.matchNo;
        case "date":
        default:
          return (
            new Date(a.match.date).getTime() -
            new Date(b.match.date).getTime()
          );
      }
    });

    return result;
  }, [matches, matchNos, rounds, cities, teams, sort, predictorOn, pricingSource, feesOn, salePct]);

  return (
    <>
      <MatchFilters matches={matches} />
      <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-2 sm:mb-4">
        Showing {filtered.length} of {matches.length} matches
      </div>
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((match) => (
          <MatchCard
            key={match.match.id}
            data={match}
            prediction={predictorOn ? PREDICTIONS_BY_MATCH.get(match.match.matchNo) : undefined}
            pricingSource={pricingSource}
            feesOn={feesOn}
            salePct={salePct}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-zinc-500 dark:text-zinc-400 py-12">
          No matches found. Try adjusting your filters.
        </p>
      )}
    </>
  );
}

function getMinFloor(m: MatchWithPrices): number {
  const floors = m.tickets
    .filter((t) => t.floorPrice != null && t.floorPrice > 0)
    .map((t) => t.floorPrice!);
  return floors.length > 0 ? Math.min(...floors) : Infinity;
}

function getMaxMultiplier(m: MatchWithPrices, pricingSource: string): number {
  const multipliers = m.tickets
    .filter((t) => t.floorPrice != null && t.floorPrice > 0)
    .map((t) => {
      const face = pricingSource === "rsd"
        ? (getRsdFaceValue(m.match.matchNo, t.category) ?? t.faceValue)
        : t.faceValue;
      return face > 0 ? t.floorPrice! / face : 0;
    });
  return multipliers.length > 0 ? Math.max(...multipliers) : 0;
}

function getTotalSales(m: MatchWithPrices): number {
  return m.tickets.reduce((sum, t) => sum + (t.saleTransactions || 0), 0);
}

const MKT_FEE = 1.15;
const COLLECT_FEE = 1.03;

function getBestMktDiscount(m: MatchWithPrices, feesOn: boolean, salePct = 0): number {
  let best = -Infinity;
  for (const t of m.tickets) {
    if (!t.floorPrice || t.floorPrice <= 0) continue;
    const mkt = m.resalePrices.find((r) => r.category === t.category);
    if (!mkt) continue;
    const effectiveMkt = mkt.price * (feesOn ? MKT_FEE : 1);
    const effectiveCollect = t.floorPrice * (1 - salePct / 100) * (feesOn ? COLLECT_FEE : 1);
    if (effectiveMkt <= effectiveCollect) continue;
    const pct = ((effectiveMkt - effectiveCollect) / effectiveMkt) * 100;
    if (pct > best) best = pct;
  }
  return best;
}

function getBestSavings(m: MatchWithPrices, pricingSource: string): number {
  const savings = m.tickets
    .filter((t) => t.floorPrice != null && t.floorPrice > 0)
    .map((t) => {
      const face = pricingSource === "rsd"
        ? (getRsdFaceValue(m.match.matchNo, t.category) ?? t.faceValue)
        : t.faceValue;
      return savingsPercent(face, t.floorPrice!);
    });
  return savings.length > 0 ? Math.max(...savings) : -Infinity;
}
