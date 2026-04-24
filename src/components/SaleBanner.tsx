"use client";

import { useState, useEffect } from "react";
import { withReferral } from "@/lib/utils";
import type { CollectPromo } from "@/lib/api";

function useCountdown(endsAt: number | null) {
  const [remaining, setRemaining] = useState<number | null>(
    endsAt ? Math.max(0, endsAt - Date.now()) : null
  );

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = Math.max(0, endsAt - Date.now());
      setRemaining(ms);
      if (ms === 0) clearInterval(id);
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining === null || remaining === 0) return null;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { h, m, s };
}

export function SaleBanner({ promo }: { promo: CollectPromo }) {
  const [dismissed, setDismissed] = useState(false);
  const countdown = useCountdown(promo.endsAt);

  // Auto-hide when the sale expires client-side
  useEffect(() => {
    if (!promo.endsAt) return;
    const ms = promo.endsAt - Date.now();
    if (ms <= 0) { setDismissed(true); return; }
    const id = setTimeout(() => setDismissed(true), ms);
    return () => clearTimeout(id);
  }, [promo.endsAt]);

  if (dismissed) return null;

  const url = withReferral("https://collect.fifa.com/marketplace");

  return (
    <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white">
      <a
        href={url}
        target="_blank"
        rel="noopener"
        className="block hover:opacity-95 transition-opacity"
      >
        <div className="max-w-7xl mx-auto px-10 py-2.5 sm:py-3 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base flex-wrap">
          {/* Pulsing badge */}
          <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-0.5 font-black text-base sm:text-lg shrink-0 animate-pulse">
            {promo.pct}% OFF
          </span>

          <span className="font-semibold">
            {promo.label} on FIFA Collect
          </span>

          <span className="hidden sm:inline text-white/80">—</span>
          <span className="hidden sm:inline text-white/90 text-sm">
            automatically applied at checkout
          </span>

          {/* Live countdown */}
          {countdown && (
            <span className="flex items-center gap-1 bg-black/20 rounded px-2 py-0.5 font-mono text-sm font-bold tabular-nums shrink-0">
              <span className="text-white/70 font-normal text-xs mr-0.5">ends in</span>
              {String(countdown.h).padStart(2, "0")}h
              {" "}{String(countdown.m).padStart(2, "0")}m
              {" "}{String(countdown.s).padStart(2, "0")}s
            </span>
          )}

          {/* Bouncing arrow */}
          <span className="font-bold animate-bounce inline-block">→</span>
          <span className="font-bold underline underline-offset-2 whitespace-nowrap">Buy now</span>
        </div>
      </a>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
