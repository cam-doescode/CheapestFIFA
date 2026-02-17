"use client";

import { useState, useRef, useEffect } from "react";

interface InfoTooltipProps {
  text: string;
  position?: "above" | "below";
}

export function InfoTooltip({ text, position = "above" }: InfoTooltipProps) {
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

  const posClass = position === "above"
    ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
    : "top-full left-0 mt-1";

  return (
    <span ref={ref} className="relative group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold cursor-help focus:outline-none"
      >
        ?
      </button>
      <span
        className={`absolute ${posClass} w-56 px-3 py-2 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] sm:text-xs leading-snug z-50 text-center shadow-lg transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
