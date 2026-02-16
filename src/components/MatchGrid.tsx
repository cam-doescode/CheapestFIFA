"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { MatchWithPrices } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { MatchFilters } from "./MatchFilters";
import { savingsPercent, parseTeams } from "@/lib/utils";
import { PREDICTIONS_BY_MATCH } from "@/data/knockout-predictions";

interface MatchGridProps {
  matches: MatchWithPrices[];
}

export function MatchGrid({ matches }: MatchGridProps) {
  const searchParams = useSearchParams();

  const rounds = (searchParams.get("round") || "").split(",").filter(Boolean);
  const cities = (searchParams.get("city") || "").split(",").filter(Boolean);
  const teams = (searchParams.get("team") || "").split(",").filter(Boolean);
  const sort = searchParams.get("sort") || "savings";
  const predictorOn = searchParams.get("predictor") === "on";

  const filtered = useMemo(() => {
    let result = matches;

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
          if (pred && (teamSet.has(pred.team1.toLowerCase()) || teamSet.has(pred.team2.toLowerCase()))) {
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
          const aSav = getBestSavings(a);
          const bSav = getBestSavings(b);
          return bSav - aSav; // highest savings first
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
  }, [matches, rounds, cities, teams, sort, predictorOn]);

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

function getBestSavings(m: MatchWithPrices): number {
  const savings = m.tickets
    .filter((t) => t.floorPrice != null && t.floorPrice > 0)
    .map((t) => savingsPercent(t.faceValue, t.floorPrice!));
  return savings.length > 0 ? Math.max(...savings) : -Infinity;
}
