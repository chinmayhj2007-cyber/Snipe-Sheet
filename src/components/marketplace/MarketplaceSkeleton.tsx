export function MarketplaceSkeleton() {
  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <div className="sticky top-0 z-40 h-16 border-b border-white/15 bg-[#090b0f]/85">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-36 animate-pulse rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="h-9 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="h-9 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="h-9 w-24 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="h-52 animate-pulse rounded-[34px] border border-white/15 bg-white/[0.04]" />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-[28px] border border-white/15 bg-white/[0.035]"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
