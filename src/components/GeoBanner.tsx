"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

/** ISO 3166-1 alpha-2 → participating team name(s) */
const ISO_TO_TEAMS: Record<string, string[]> = {
  DZ: ["Algeria"],
  AR: ["Argentina"],
  AU: ["Australia"],
  AT: ["Austria"],
  BE: ["Belgium"],
  BR: ["Brazil"],
  CA: ["Canada"],
  CO: ["Colombia"],
  HR: ["Croatia"],
  EC: ["Ecuador"],
  EG: ["Egypt"],
  GB: ["England", "Scotland"],
  FR: ["France"],
  DE: ["Germany"],
  GH: ["Ghana"],
  IR: ["Iran"],
  CI: ["Ivory Coast"],
  JP: ["Japan"],
  KR: ["Korea Republic"],
  MX: ["Mexico"],
  MA: ["Morocco"],
  NL: ["Netherlands"],
  NZ: ["New Zealand"],
  NO: ["Norway"],
  PA: ["Panama"],
  PT: ["Portugal"],
  QA: ["Qatar"],
  SA: ["Saudi Arabia"],
  SN: ["Senegal"],
  ZA: ["South Africa"],
  ES: ["Spain"],
  CH: ["Switzerland"],
  TN: ["Tunisia"],
  UY: ["Uruguay"],
  US: ["USA"],
  UZ: ["Uzbekistan"],
};

/** ISO code → flag CDN code (matches TEAM_TO_ISO values) */
const ISO_TO_FLAG: Record<string, string> = {
  DZ: "dz", AR: "ar", AU: "au", AT: "at", BE: "be", BR: "br", CA: "ca",
  CO: "co", HR: "hr", EC: "ec", EG: "eg", GB: "gb-eng", FR: "fr", DE: "de",
  GH: "gh", IR: "ir", CI: "ci", JP: "jp", KR: "kr", MX: "mx", MA: "ma",
  NL: "nl", NZ: "nz", NO: "no", PA: "pa", PT: "pt", QA: "qa", SA: "sa",
  SN: "sn", ZA: "za", ES: "es", CH: "ch", TN: "tn", UY: "uy", US: "us",
  UZ: "uz",
};

/** Map detected cities to WC2026 host cities (case-insensitive substring matching) */
const CITY_ALIASES: Record<string, string[]> = {
  "Vancouver": ["vancouver"],
  "Seattle": ["seattle", "tacoma", "bellevue"],
  "San Francisco": ["san francisco", "san jose", "oakland", "bay area", "santa clara"],
  "Los Angeles": ["los angeles", "la", "inglewood", "long beach", "anaheim", "pasadena"],
  "Guadalajara": ["guadalajara", "zapopan"],
  "Monterrey": ["monterrey", "san pedro garza"],
  "Mexico City": ["mexico city", "ciudad de mexico", "cdmx"],
  "Kansas City": ["kansas city", "overland park"],
  "Dallas": ["dallas", "fort worth", "arlington", "plano", "irving"],
  "Houston": ["houston", "sugar land", "the woodlands"],
  "Atlanta": ["atlanta", "marietta", "decatur"],
  "Orlando": ["orlando", "kissimmee"],
  "Miami": ["miami", "fort lauderdale", "hialeah", "hollywood"],
  "Philadelphia": ["philadelphia", "camden", "cherry hill"],
  "New York/New Jersey": ["new york", "newark", "jersey city", "brooklyn", "manhattan", "east rutherford"],
  "Boston": ["boston", "cambridge", "foxborough", "foxboro"],
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function detectHostCity(geoCity: string): string | null {
  const lower = geoCity.toLowerCase();
  for (const [hostCity, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      return hostCity;
    }
  }
  return null;
}

export function GeoBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [suggestion, setSuggestion] = useState<{
    type: "team" | "city" | "both";
    teams?: string[];
    city?: string;
    countryName?: string;
    flagCode?: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Don't show if already dismissed or if filters are already applied
    if (localStorage.getItem("geo-banner-dismissed")) return;
    if (searchParams.get("team") || searchParams.get("city")) return;

    const country = getCookie("geo-country");
    const geoCity = getCookie("geo-city");
    if (!country) return;

    const teams = ISO_TO_TEAMS[country];
    const hostCity = geoCity ? detectHostCity(geoCity) : null;
    const flagCode = ISO_TO_FLAG[country];

    if (teams && hostCity) {
      setSuggestion({ type: "both", teams, city: hostCity, countryName: teams[0], flagCode });
      setDismissed(false);
    } else if (teams) {
      setSuggestion({ type: "team", teams, countryName: teams[0], flagCode });
      setDismissed(false);
    } else if (hostCity) {
      setSuggestion({ type: "city", city: hostCity });
      setDismissed(false);
    }
  }, [searchParams]);

  function applyFilter(filterType: "team" | "city", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(filterType, value.toLowerCase());
    router.push(`/?${params.toString()}`, { scroll: false });
    dismiss();
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("geo-banner-dismissed", "1");
  }

  if (dismissed || !suggestion) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {suggestion.flagCode && (
            <Image
              src={`https://flagcdn.com/24x18/${suggestion.flagCode}.png`}
              alt=""
              width={20}
              height={15}
              className="rounded-sm"
              unoptimized
            />
          )}
          <span className="text-blue-700 dark:text-blue-300">
            {suggestion.type === "both" ? (
              <>Browsing from near {suggestion.city}?</>
            ) : suggestion.type === "city" ? (
              <>Browsing from near {suggestion.city}?</>
            ) : (
              <>Browsing from {suggestion.countryName}?</>
            )}
          </span>
          {suggestion.teams && (
            <button
              type="button"
              onClick={() => applyFilter("team", suggestion.teams!.join(","))}
              className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
            >
              {suggestion.teams.length > 1
                ? `Show ${suggestion.teams.join(" & ")} matches`
                : `Show ${suggestion.teams[0]} matches`}
            </button>
          )}
          {suggestion.city && (
            <button
              type="button"
              onClick={() => applyFilter("city", suggestion.city!)}
              className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
            >
              Show {suggestion.city} matches
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-blue-400 dark:text-blue-600 hover:text-blue-600 dark:hover:text-blue-400 shrink-0 p-1"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
