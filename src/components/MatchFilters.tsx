"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { MatchWithPrices } from "@/lib/types";
import { ROUND_FILTERS } from "@/lib/utils";

interface MatchFiltersProps {
  matches: MatchWithPrices[];
}

export function MatchFilters({ matches }: MatchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentRound = searchParams.get("round") || "all";
  const currentCity = searchParams.get("city") || "all";
  const currentTeam = searchParams.get("team") || "";
  const currentSort = searchParams.get("sort") || "date";

  const cities = useMemo(() => {
    const unique = [...new Set(matches.map((m) => m.match.city))].sort();
    return unique;
  }, [matches]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "" || value === "date") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Team search */}
      <input
        type="text"
        placeholder="Search team..."
        value={currentTeam}
        onChange={(e) => updateParam("team", e.target.value)}
        className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
      />

      {/* Round filter */}
      <select
        value={currentRound}
        onChange={(e) => updateParam("round", e.target.value)}
        className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {ROUND_FILTERS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {/* City filter */}
      <select
        value={currentCity}
        onChange={(e) => updateParam("city", e.target.value)}
        className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="all">All Cities</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={currentSort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="date">Sort by Date</option>
        <option value="cheapest">Cheapest First</option>
        <option value="savings">Best Savings</option>
        <option value="match">Match Number</option>
      </select>
    </div>
  );
}
