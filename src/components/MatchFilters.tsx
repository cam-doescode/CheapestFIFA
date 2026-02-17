"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { MatchWithPrices } from "@/lib/types";
import { ROUND_FILTERS, parseTeams } from "@/lib/utils";
import { MultiSelect } from "./MultiSelect";
import { InfoTooltip } from "./InfoTooltip";

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
  const predictorOn = searchParams.get("predictor") !== "off";
  const pricingSource = searchParams.get("pricing") || "collect";

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
      // Clear param when it matches the default
      const defaults: Record<string, string> = { sort: "savings", predictor: "on", pricing: "collect" };
      if (value === defaults[key]) {
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
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
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
        className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
      >
        <option value="date">Sort by Date</option>
        <option value="cheapest">Cheapest First</option>
        <option value="savings">Best Savings</option>
        <option value="match">Match Number</option>
      </select>

      {/* Pricing Source segmented control */}
      <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
        <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Face Value:</span>
        <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <button
            type="button"
            onClick={() => updateSingleParam("pricing", "collect")}
            className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
              pricingSource === "collect"
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            Collect
          </button>
          <button
            type="button"
            onClick={() => updateSingleParam("pricing", "rsd")}
            className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors border-l border-zinc-200 dark:border-zinc-700 ${
              pricingSource === "rsd"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            RSD
          </button>
        </div>
        <InfoTooltip text="Compare face values from FIFA Collect (marketplace resale) vs. RSD (Random Selection Draw). RSD prices vary by venue." />
      </div>

      {/* Knockout Predictor toggle */}
      <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateSingleParam("predictor", predictorOn ? "off" : "on")}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm transition-colors ${
            predictorOn
              ? "border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"
              : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <span
            className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${
              predictorOn ? "bg-purple-500" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                predictorOn ? "translate-x-3.5 ml-0" : "translate-x-0.5"
              }`}
            />
          </span>
          Knockout Predictor
        </button>
        <InfoTooltip text="Shows projected knockout matchups based on simulation odds. These are predictions only — actual matchups depend on group stage results." />
      </div>
    </div>
  );
}
