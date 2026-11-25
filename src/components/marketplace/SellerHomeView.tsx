'use client';

import { Flame, PackagePlus, Sparkles, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuctionCard } from '@/components/marketplace/AuctionCard';
import { CategoryGrid } from '@/components/marketplace/CategoryGrid';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import { UnifiedSearchBar } from '@/components/marketplace/UnifiedSearchBar';
import { ShinyButton } from '@/components/ui/shiny-button';
import {
  type AuctionItem,
  getAuctionPhase,
  type MarketplaceUser,
} from '@/lib/marketplace/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SellerHomeViewProps {
  user: MarketplaceUser;
  initialAuctions: AuctionItem[];
  initialSavedIds: string[];
}

export function SellerHomeView({
  user,
  initialAuctions,
  initialSavedIds,
}: SellerHomeViewProps) {
  const router = useRouter();
  const [auctions, setAuctions] = useState<AuctionItem[]>(initialAuctions);
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(initialSavedIds));
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel('seller-home-auctions')
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

  const { myListings, totalBidsOnMine, featured, trending, categoryCounts } = useMemo(() => {
    const now = Date.now();
    const mine = auctions.filter((a) => a.seller_id === user.id);
    const bidsSum = mine.reduce((acc, a) => acc + (a.bid_count ?? 0), 0);

    const live = auctions.filter((a) => getAuctionPhase(a, now) === 'live');
    const pool = live.length > 0 ? live : auctions;

    const counts: Record<string, number> = {};
    for (const a of auctions) {
      counts[a.category] = (counts[a.category] ?? 0) + 1;
    }

    return {
      myListings: mine,
      totalBidsOnMine: bidsSum,
      featured: [...pool].sort((a, b) => b.current_price - a.current_price).slice(0, 3),
      trending: [...pool]
        .sort((a, b) => (b.bid_count ?? 0) - (a.bid_count ?? 0))
        .slice(0, 3),
      categoryCounts: counts,
    };
  }, [auctions, user.id]);

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={user} />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        {/* Personalized Seller Welcome Section & Single Unified Search */}
        <section className="smoky-glass-card rounded-[34px] border border-white/20 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[#e2e4e8]/15 px-3 py-1 text-[11px] font-medium text-white">
                <Store className="h-3.5 w-3.5 text-[#e2e4e8]" aria-hidden="true" />
                <span>Seller Studio &bull; Protected Anti-Sniping Auctions</span>
              </div>

              <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-4xl">
                Welcome, {user.displayName}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Launch verified gadget auctions with custom reserve pricing, live bid
                monitoring, and automatic 30-second anti-snipe extensions.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                    Your Listings
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-white">
                    {myListings.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/55">
                    Bids Received
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-white">
                    {totalBidsOnMine}
                  </p>
                </div>
              </div>

              <div className="sm:w-48">
                <ShinyButton
                  label="+ SELL NEW ITEM"
                  onClick={() => router.push('/seller/create-listing')}
                  fillColor="#0b0c10"
                  labelColor="#ffffff"
                  accentColor="#a7adb6"
                  accentSoftColor="#e2e4e8"
                  cornerRadius={9999}
                  speckleOpacity={0.28}
                  className="flex h-12 w-full items-center justify-center !p-0 !text-xs !font-semibold !tracking-wider shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <UnifiedSearchBar
              auctions={auctions}
              savedSet={savedSet}
              onToggleSave={handleToggleSave}
              viewerRole="seller"
              viewerId={user.id}
              placeholder="Search marketplace prices, categories, or active auctions..."
              externalCategory={selectedCategory}
              onExternalCategoryReset={handleCategoryReset}
            />
          </div>
        </section>

        {/* Seller's Own Listings */}
        <section aria-labelledby="seller-listings-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PackagePlus className="h-4 w-4 text-[#e2e4e8]" aria-hidden="true" />
              <h2 id="seller-listings-heading" className="text-lg font-semibold tracking-tight">
                Your Auction Listings
              </h2>
            </div>

            <Link
              href="/seller/create-listing"
              prefetch
              className="rounded-full border border-white/20 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white transition hover:border-white/40 hover:bg-white/10"
            >
              + New Listing
            </Link>
          </div>

          {myListings.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myListings.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isSaved={savedSet.has(auction.id)}
                  onToggleSave={handleToggleSave}
                  viewerRole="seller"
                  viewerId={user.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/15 bg-[#0e1015]/80 px-6 py-10 text-center">
              <PackagePlus className="mx-auto h-7 w-7 text-white/45" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-white">
                You haven&apos;t published any auctions yet
              </p>
              <p className="mt-1 text-xs text-white/60">
                Click the + button in your navigation bar or create your first item below.
              </p>
              <Link
                href="/seller/create-listing"
                prefetch
                className="smoky-cta-btn mt-5 inline-flex h-10 items-center justify-center rounded-full px-6 text-xs font-medium text-white"
              >
                + Create First Auction
              </Link>
            </div>
          )}
        </section>

        {/* Featured Marketplace Auctions */}
        <section aria-labelledby="seller-featured-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#e2e4e8]" aria-hidden="true" />
            <h2 id="seller-featured-heading" className="text-lg font-semibold tracking-tight">
              Featured Marketplace Auctions
            </h2>
          </div>

          {featured.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((auction) => (
                <AuctionCard
                  key={`feat-${auction.id}`}
                  auction={auction}
                  isSaved={savedSet.has(auction.id)}
                  onToggleSave={handleToggleSave}
                  viewerRole="seller"
                  viewerId={user.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/15 bg-[#0e1015]/80 px-6 py-8 text-center text-xs text-white/60">
              No marketplace auctions listed yet.
            </div>
          )}
        </section>

        {/* Trending Auctions */}
        {trending.length > 0 ? (
          <section aria-labelledby="seller-trending-heading" className="space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#e2e4e8]" aria-hidden="true" />
              <h2 id="seller-trending-heading" className="text-lg font-semibold tracking-tight">
                Trending Across Platform
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((auction) => (
                <AuctionCard
                  key={`trend-${auction.id}`}
                  auction={auction}
                  isSaved={savedSet.has(auction.id)}
                  onToggleSave={handleToggleSave}
                  viewerRole="seller"
                  viewerId={user.id}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Auction Categories */}
        <section aria-labelledby="seller-categories-heading" className="space-y-4 pb-6">
          <h2 id="seller-categories-heading" className="text-lg font-semibold tracking-tight">
            Auction Categories
          </h2>
          <CategoryGrid
            countsByCategory={categoryCounts}
            onSelectCategory={handleCategoryPick}
          />
        </section>
      </main>
    </div>
  );
}
