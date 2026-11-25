'use client';

import { Flame, Gavel, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuctionCard } from '@/components/marketplace/AuctionCard';
import { CategoryGrid } from '@/components/marketplace/CategoryGrid';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import { UnifiedSearchBar } from '@/components/marketplace/UnifiedSearchBar';
import {
  type AuctionItem,
  getAuctionPhase,
  type MarketplaceUser,
} from '@/lib/marketplace/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface BidderHomeViewProps {
  user: MarketplaceUser;
  initialAuctions: AuctionItem[];
  initialSavedIds: string[];
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-[28px] border border-white/15 bg-[#0e1015]/80 px-6 py-10 text-center">
      <Gavel className="mx-auto h-7 w-7 text-white/40" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-white/80">{message}</p>
      <p className="mt-1 text-xs text-white/50">
        New verified tech &amp; gadget auctions appear here automatically as sellers publish them.
      </p>
    </div>
  );
}

export function BidderHomeView({
  user,
  initialAuctions,
  initialSavedIds,
}: BidderHomeViewProps) {
  const [auctions, setAuctions] = useState<AuctionItem[]>(initialAuctions);
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(initialSavedIds));
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel('bidder-home-auctions')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions' },
        (payload) => {
          const updated = payload.new as Partial<AuctionItem> & { id?: string };
          if (!updated.id) return;
          setAuctions((prev) =>
            prev.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    current_price: Number(updated.current_price ?? item.current_price),
                    highest_bidder_id: updated.highest_bidder_id ?? item.highest_bidder_id,
                    ends_at: updated.ends_at ?? item.ends_at,
                    status: (updated.status as AuctionItem['status']) ?? item.status,
                    extensions_count: Number(
                      updated.extensions_count ?? item.extensions_count
                    ),
                  }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleSave = useCallback((auctionId: string, nextSaved: boolean) => {
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(auctionId);
      else next.delete(auctionId);
      return next;
    });
  }, []);

  const handleCategoryPick = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    const searchEl = document.getElementById('unified-auction-search');
    searchEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleCategoryReset = useCallback(() => {
    setSelectedCategory(undefined);
  }, []);

  const { liveAuctions, featured, trending, recent, recommended, categoryCounts } =
    useMemo(() => {
      const now = Date.now();
      const live = auctions.filter((a) => getAuctionPhase(a, now) === 'live');
      const pool = live.length > 0 ? live : auctions;

      const counts: Record<string, number> = {};
      for (const a of auctions) {
        counts[a.category] = (counts[a.category] ?? 0) + 1;
      }

      const byPriceDesc = [...pool].sort((a, b) => b.current_price - a.current_price);
      const byTrending = [...pool].sort(
        (a, b) => (b.bid_count ?? 0) - (a.bid_count ?? 0) || b.current_price - a.current_price
      );
      const byRecent = [...auctions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const byEndingSoon = [...pool].sort(
        (a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
      );

      return {
        liveAuctions: live,
        featured: byPriceDesc.slice(0, 3),
        trending: byTrending.slice(0, 3),
        recent: byRecent.slice(0, 6),
        recommended: byEndingSoon.slice(0, 3),
        categoryCounts: counts,
      };
    }, [auctions]);

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={user} />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        {/* Welcome Hero & Single Unified Instant Search */}
        <section className="smoky-glass-card rounded-[34px] border border-white/20 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/85">
                <ShieldCheck className="h-3.5 w-3.5 text-[#d5d7db]" aria-hidden="true" />
                <span>30s Anti-Sniping &amp; Auto-Proxy Bidding Active</span>
              </div>

              <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-4xl">
                Welcome back, {user.displayName}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Discover verified tech &amp; gadget drops, place real-time bids, and lock in
                your auto-proxy ceiling without last-second sniping.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                  Live Drops
                </p>
                <p className="mt-0.5 text-lg font-semibold text-white">
                  {liveAuctions.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                  Saved
                </p>
                <p className="mt-0.5 text-lg font-semibold text-white">{savedSet.size}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <UnifiedSearchBar
              auctions={auctions}
              savedSet={savedSet}
              onToggleSave={handleToggleSave}
              viewerRole="bidder"
              viewerId={user.id}
              externalCategory={selectedCategory}
              onExternalCategoryReset={handleCategoryReset}
            />
          </div>
        </section>

        {/* Featured Auctions */}
        <section aria-labelledby="bidder-featured-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#e2e4e8]" aria-hidden="true" />
              <h2 id="bidder-featured-heading" className="text-lg font-semibold tracking-tight">
                Featured Auctions
              </h2>
            </div>
          </div>

          {featured.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isSaved={savedSet.has(auction.id)}
                  onToggleSave={handleToggleSave}
                  viewerRole="bidder"
                  viewerId={user.id}
                />
              ))}
            </div>
          ) : (
            <EmptySection message="No featured auctions are live right now." />
          )}
        </section>

        {/* Trending Auctions */}
        <section aria-labelledby="bidder-trending-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#e2e4e8]" aria-hidden="true" />
            <h2 id="bidder-trending-heading" className="text-lg font-semibold tracking-tight">
              Trending Bidding Wars
            </h2>
          </div>

          {trending.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((auction) => (
                <AuctionCard
                  key={`trend-${auction.id}`}
                  auction={auction}
                  isSaved={savedSet.has(auction.id)}
                  onToggleSave={handleToggleSave}
                  viewerRole="bidder"
                  viewerId={user.id}
                />
              ))}
            </div>
          ) : (
            <EmptySection message="Trending auctions will appear once bidding activity begins." />
          )}
        </section>

        {/* Categories */}
        <section aria-labelledby="bidder-categories-heading" className="space-y-4">
          <h2 id="bidder-categories-heading" className="text-lg font-semibold tracking-tight">
            Browse Categories
          </h2>
          <CategoryGrid
            countsByCategory={categoryCounts}
            onSelectCategory={handleCategoryPick}
          />
        </section>

        {/* Recently Added */}
        <section aria-labelledby="bidder-recent-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-[#e2e4e8]" aria-hidden="true" />
            <h2 id="bidder-recent-heading" className="text-lg font-semibold tracking-tight">
              Recently Added Items
            </h2>
          </div>

          {recent.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((auction) => (
                <AuctionCard
                  key={`recent-${auction.id}`}
                  auction={auction}
                  isSaved={savedSet.has(auction.id)}
                  onToggleSave={handleToggleSave}
                  viewerRole="bidder"
                  viewerId={user.id}
                />
              ))}
            </div>
          ) : (
            <EmptySection message="No recently added items yet." />
          )}
        </section>

        {/* Recommended Ending Soon */}
        {recommended.length > 0 ? (
          <section aria-labelledby="bidder-recommended-heading" className="space-y-4 pb-6">
            <h2
              id="bidder-recommended-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Recommended &bull; Ending Soon
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((auction) => (
                <AuctionCard
                  key={`rec-${auction.id}`}
                  auction={auction}
                  isSaved={savedSet.has(auction.id)}
                  onToggleSave={handleToggleSave}
                  viewerRole="bidder"
                  viewerId={user.id}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
