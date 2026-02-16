"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

interface StadiumMapModalProps {
  stadium: string;
  city: string;
  mapSrc: string;
}

export function StadiumMapModal({ stadium, city, mapSrc }: StadiumMapModalProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
      >
        {stadium}, {city}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {stadium} &mdash; {city}
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-xl leading-none p-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Map image */}
            <div className="overflow-auto max-h-[calc(90vh-3.5rem)]">
              <Image
                src={mapSrc}
                alt={`${stadium} seating map`}
                width={1200}
                height={900}
                className="w-full h-auto"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
