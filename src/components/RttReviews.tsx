"use client";

import { useState, useCallback, useEffect } from "react";
import { RTT_REVIEWS, type RttReview } from "@/data/rtt-reviews";

export function RttReviews() {
  const [active, setActive] = useState<RttReview | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Drop any review whose image file isn't present yet, so nothing renders broken
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, close]);

  const reviews = RTT_REVIEWS.filter((r) => !failed.has(r.id));
  const markFailed = (id: string) =>
    setFailed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  if (reviews.length === 0) return null;

  return (
    <section className="mb-5 sm:mb-6 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 sm:p-4">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className="w-full flex items-baseline justify-between gap-2 flex-wrap text-left"
      >
        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <span className={`text-emerald-500 text-xs transition-transform ${collapsed ? "" : "rotate-90"}`}>▶</span>
          Thinking about RTT? See how it worked for others
        </h2>
        <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
          {collapsed ? "Show real seat reports" : "Real seats fans got after converting on FIFA Collect · via r/FIFACollect"}
        </span>
      </button>

      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${collapsed ? "hidden" : "mt-2 sm:mt-3"}`}>
        {reviews.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActive(r)}
            className="group text-left rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.image}
                alt={`${r.match} — seat view`}
                loading="lazy"
                onError={() => markFailed(r.id)}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-emerald-600/90 shadow">
                {r.category}
              </span>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{r.match}</p>
              {r.detail && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">{r.detail}</p>
              )}
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 italic">“{r.quote}”</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">via r/FIFACollect · tap to view</p>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {active.match}
                {active.detail ? ` · ${active.detail}` : ""}
              </h3>
              <button
                type="button"
                onClick={close}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-xl leading-none p-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.image}
                alt={`${active.match} — seat view`}
                className="w-full h-auto"
              />
              <div className="p-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">“{active.quote}”</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">via r/FIFACollect</span>
                  <a
                    href={active.url}
                    target="_blank"
                    rel="noopener"
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    View on Reddit &nearr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
