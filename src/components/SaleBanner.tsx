"use client";

import { useState } from "react";
import { withReferral } from "@/lib/utils";
import type { CollectPromo } from "@/lib/api";

export function SaleBanner({ promo }: { promo: CollectPromo }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const url = withReferral("https://collect.fifa.com/marketplace");

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm">
        <a
          href={url}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 flex-wrap hover:opacity-80 transition-opacity"
        >
          <span className="text-amber-600 dark:text-amber-400">⚡</span>
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            {promo.pct}% off
          </span>
          <span className="text-amber-700 dark:text-amber-400">
            {promo.label} on FIFA Collect — automatically applied at checkout
          </span>
          <span className="text-amber-600 dark:text-amber-500 underline font-medium whitespace-nowrap">
            Buy now →
          </span>
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-400 dark:text-amber-600 hover:text-amber-600 dark:hover:text-amber-400 shrink-0 p-1"
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
