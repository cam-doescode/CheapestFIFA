"use client";

import { useState, useRef, useEffect } from "react";
import type { SupplyTrendData } from "@/lib/types";

interface SupplyTrendProps {
  data: SupplyTrendData;
  label?: string;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SupplyTrend({ data, label = "tickets listed" }: SupplyTrendProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const { current, history } = data;
  if (current === 0 && history.length === 0) return null;

  // Determine trend arrow by comparing two most recent snapshots
  const yesterday = history.length >= 2 ? history[1].value : null;
  const todayVal = history.length >= 1 ? history[0].value : current;
  let arrow = "";
  let arrowColor = "";
  if (yesterday !== null) {
    if (todayVal > yesterday) {
      arrow = "\u2191";
      arrowColor = "text-emerald-500";
    } else if (todayVal < yesterday) {
      arrow = "\u2193";
      arrowColor = "text-red-500";
    } else {
      arrow = "\u2192";
      arrowColor = "text-zinc-400";
    }
  }

  return (
    <span ref={ref} className="relative group/supply inline-flex items-center gap-1">
      <span>
        <span className="font-semibold">{current.toLocaleString()}</span> {label}
      </span>
      {arrow && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`${arrowColor} font-bold cursor-help focus:outline-none`}
        >
          {arrow}
        </button>
      )}
      {history.length > 0 && (
        <span
          className={`absolute top-full left-0 mt-1 min-w-[180px] w-max px-3 py-2 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] sm:text-xs leading-snug z-50 shadow-lg transition-opacity ${
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none group-hover/supply:opacity-100 group-hover/supply:pointer-events-auto"
          }`}
        >
          <div className="font-semibold mb-1 text-zinc-300">
            Supply trend (last {history.length} day{history.length !== 1 ? "s" : ""})
          </div>
          {history.map((point, i) => {
            const prev = history[i + 1];
            const diff = prev ? point.value - prev.value : null;
            return (
              <div key={point.date} className="flex justify-between gap-3 py-0.5">
                <span>{formatShortDate(point.date)}</span>
                <span className="font-medium">
                  {point.value.toLocaleString()}
                  {diff !== null && diff !== 0 && (
                    <span className={diff > 0 ? "text-emerald-400 ml-1" : "text-red-400 ml-1"}>
                      ({diff > 0 ? "+" : ""}{diff.toLocaleString()})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </span>
      )}
    </span>
  );
}
