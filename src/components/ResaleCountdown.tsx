"use client";

import { useState, useEffect } from "react";

const RESALE_CLOSE = new Date("2026-02-22T23:59:59Z").getTime();
const RESALE_REOPEN = new Date("2026-04-08T00:00:00Z").getTime();

export function ResaleCountdown() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (now >= RESALE_REOPEN) return null;

  if (now >= RESALE_CLOSE) {
    // Phase B: Resale is closed
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-semibold whitespace-nowrap">
        FIFA Resale closed &mdash; Collect is the only marketplace
      </span>
    );
  }

  // Phase A: Countdown to closure
  const diffMs = RESALE_CLOSE - now;
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);

  return (
    <span className="text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs whitespace-nowrap">
      <span className="font-semibold">Resale closes in {days}d {hours}h</span>
      <span className="hidden sm:inline"> &mdash; Collect is the only option after</span>
    </span>
  );
}
