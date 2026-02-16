"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { MatchWithPrices } from "@/lib/types";
import { ROUND_FILTERS, parseTeams } from "@/lib/utils";
import { MultiSelect } from "./MultiSelect";

interface MatchFiltersProps {
  matches: MatchWithPrices[];
}

export function MatchFilters({ matches }: MatchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedRounds = (searchParams.get("round") || "").split(",").filter(Boolean);
  const selectedCities = (searchParams.get("city") || "").split(",").filter(Boolean);
  const selectedTeams = (searchParams.get("team") || "").split(",").filter(Boolean);
  const currentSort = searchParams.get("sort") || "savings";

  const cities = useMemo(() => {
    return [...new Set(matches.map((m) => m.match.city))].sort();
  }, [matches]);

  const teams = useMemo(() => {
    const all = new Set<string>();
    for (const m of matches) {
      for (const t of parseTeams(m.match.teams)) {
        // Skip placeholder names (e.g. "1A", "W Play-Off A", "L101")
        if (/^[0-9LW]/.test(t) || t.includes("Play-Off")) continue;
        all.add(t);
      }
    }
    return [...all].sort();
  }, [matches]);

  const updateParam = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (values.length === 0) {
        params.delete(key);
      } else {
        params.set(key, values.join(","));
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  const updateSingleParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "savings") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  const roundOptions = ROUND_FILTERS
    .filter((r) => r.value !== "all")
    .map((r) => ({ value: r.value, label: r.label }));

  const cityOptions = cities.map((c) => ({ value: c, label: c }));
  const teamOptions = teams.map((t) => ({ value: t, label: t }));

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Team multi-select */}
      <MultiSelect
        label="All Teams"
        options={teamOptions}
        selected={selectedTeams}
        onChange={(vals) => updateParam("team", vals)}
      />

      {/* Round multi-select */}
      <MultiSelect
        label="All Rounds"
        options={roundOptions}
        selected={selectedRounds}
        onChange={(vals) => updateParam("round", vals)}
      />

      {/* City multi-select */}
      <MultiSelect
        label="All Cities"
        options={cityOptions}
        selected={selectedCities}
        onChange={(vals) => updateParam("city", vals)}
      />

      {/* Sort (single select — keep as dropdown) */}
      <select
        value={currentSort}
        onChange={(e) => updateSingleParam("sort", e.target.value)}
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
