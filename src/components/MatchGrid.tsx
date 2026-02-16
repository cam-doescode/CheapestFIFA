"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { MatchWithPrices } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { MatchFilters } from "./MatchFilters";
import { savingsPercent } from "@/lib/utils";

interface MatchGridProps {
  matches: MatchWithPrices[];
}

export function MatchGrid({ matches }: MatchGridProps) {
  const searchParams = useSearchParams();

  const round = searchParams.get("round") || "all";
  const city = searchParams.get("city") || "all";
  const team = searchParams.get("team") || "";
  const sort = searchParams.get("sort") || "date";

  const filtered = useMemo(() => {
    let result = matches;

    if (round !== "all") {
      result = result.filter((m) => m.match.round === parseInt(round));
    }

    if (city !== "all") {
      result = result.filter((m) => m.match.city === city);
    }

    if (team) {
      const search = team.toLowerCase();
      result = result.filter((m) =>
        m.match.teams.toLowerCase().includes(search)
      );
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
  }, [matches, round, city, team, sort]);

  return (
    <>
      <MatchFilters matches={matches} />
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Showing {filtered.length} of {matches.length} matches
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((match) => (
          <MatchCard key={match.match.id} data={match} />
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
