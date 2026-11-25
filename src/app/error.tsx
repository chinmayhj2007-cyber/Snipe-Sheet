'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalAuthError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Keep error handling safe without printing sensitive payloads.
    if (error instanceof Error && 'digest' in error && typeof error.digest === 'string') {
      console.error('Route error digest:', error.digest);
    }
  }, [error]);

  return (
    <main className="smoky-ambient-page flex min-h-dvh w-full items-center justify-center sm:p-6">
      <div className="smoky-glass-card flex min-h-dvh w-full flex-col items-center justify-center px-7 py-10 text-center sm:min-h-[640px] sm:max-w-[420px] sm:rounded-[38px] sm:border sm:border-white/25">
        <p className="text-base font-medium italic tracking-tight text-white/95">
          Snipe Shield
        </p>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="mt-3 max-w-xs text-sm text-white/75">
          We hit an unexpected hiccup loading this screen. Try again or return to login.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="smoky-cta-btn h-12 w-full cursor-pointer rounded-full text-sm font-medium text-white transition"
          >
            Try Again
          </button>
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center rounded-full border border-white/25 bg-white/[0.06] text-sm font-medium text-white/90 transition hover:bg-white/[0.12]"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
