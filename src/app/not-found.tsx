import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="smoky-ambient-page flex min-h-dvh w-full items-center justify-center sm:p-6">
      <section
        aria-label="Page Not Found"
        className="smoky-glass-card flex min-h-dvh w-full flex-col items-center justify-center px-7 py-10 text-center backdrop-blur-2xl sm:min-h-[560px] sm:max-w-[420px] sm:rounded-[38px] sm:border sm:border-white/25"
      >
        <div className="relative z-10 flex w-full flex-col items-center">
          <p className="text-base font-medium italic tracking-tight text-white/95">
            Snipe Shield
          </p>

          <span className="mt-5 inline-flex items-center rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md">
            404 &bull; Not Found
          </span>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Resource not found
          </h1>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            The auction listing or page you requested does not exist or may have been removed.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Link
              href="/dashboard"
              className="smoky-cta-btn flex h-12 w-full items-center justify-center rounded-full text-sm font-medium text-white transition"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="flex h-11 w-full items-center justify-center rounded-full border border-white/25 bg-white/[0.06] text-sm font-medium text-white/90 transition hover:bg-white/[0.12]"
            >
              Return Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
