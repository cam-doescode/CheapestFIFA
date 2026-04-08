"use client";

import { useState, useEffect } from "react";

function ApplePayBadge() {
  return (
    <span className="inline-flex items-center bg-black text-white text-[11px] font-semibold px-2 py-0.5 rounded-md leading-none">
      Apple Pay
    </span>
  );
}

function GooglePayBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-white border border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-md leading-none">
      {/* Google G in brand colors */}
      <svg viewBox="0 0 18 18" className="h-3 w-3 shrink-0" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
        <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      <span className="text-zinc-700 dark:text-zinc-200">Pay</span>
    </span>
  );
}

export function PaymentBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("payment-banner-dismissed")) {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("payment-banner-dismissed", "1");
  }

  if (dismissed) return null;

  return (
    <>
      <div className="bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/50">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-violet-700 dark:text-violet-300 font-medium">
              FIFA Collect now accepts
            </span>
            <ApplePayBadge />
            <span className="text-violet-400 dark:text-violet-600">&amp;</span>
            <GooglePayBadge />
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-violet-400 dark:text-violet-600 hover:text-violet-600 dark:hover:text-violet-400 shrink-0 p-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

    </>
  );
}
