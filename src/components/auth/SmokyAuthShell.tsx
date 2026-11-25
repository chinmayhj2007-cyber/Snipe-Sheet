import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface SmokyAuthShellProps {
  headlineLine1: string;
  headlineLine2: string;
  showBackToLogin?: boolean;
  isDemoMode?: boolean;
  compact?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function SmokyAuthShell({
  headlineLine1,
  headlineLine2,
  showBackToLogin = false,
  isDemoMode = false,
  compact = false,
  children,
  footer,
}: SmokyAuthShellProps) {
  return (
    <main className="smoky-ambient-page relative flex min-h-dvh w-full items-center justify-center sm:px-6 sm:py-6">
      <section
        aria-label="Snipe Shield Authentication"
        className={`smoky-glass-card flex min-h-dvh w-full flex-col justify-between px-6 pb-5 pt-7 backdrop-blur-2xl sm:min-h-0 sm:max-w-[410px] sm:rounded-[34px] sm:border sm:border-white/20 sm:px-8 sm:pb-6 sm:pt-7 ${
          compact ? 'sm:min-h-[520px]' : 'sm:min-h-[640px]'
        }`}
      >
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          {/* Top bar with optional circular back button */}
          <div className="relative flex min-h-9 items-center justify-center">
            {showBackToLogin ? (
              <Link
                href="/login"
                aria-label="Back to Login"
                className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 backdrop-blur-md transition hover:border-white/45 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : null}

            <span className="text-[15px] font-medium italic tracking-tight text-white/90">
              Snipe Shield
            </span>
          </div>

          {/* Centred 2-line display headline */}
          <h1 className="mt-4 text-center text-[25px] font-semibold leading-[1.18] tracking-[-0.025em] text-white sm:text-[26px]">
            <span className="block">{headlineLine1}</span>
            <span className="block">{headlineLine2}</span>
          </h1>

          {/* Quiet monochrome status pill when Supabase keys aren't configured */}
          {isDemoMode ? (
            <div className="mt-3 flex justify-center">
              <span
                role="status"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-medium text-white/75 backdrop-blur-md"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/60" aria-hidden="true" />
                Demo mode · Supabase not connected
              </span>
            </div>
          ) : null}

          <div className="mt-4 flex min-w-0 flex-1 flex-col">{children}</div>
        </div>

        {footer ? (
          <footer className="relative z-10 mt-4 text-center text-xs text-white/70">
            {footer}
          </footer>
        ) : null}
      </section>
    </main>
  );
}
