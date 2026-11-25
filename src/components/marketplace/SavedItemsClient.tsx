'use client';

import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { AuctionCard } from '@/components/marketplace/AuctionCard';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import type { AuctionItem, MarketplaceUser } from '@/lib/marketplace/types';

interface SavedItemsClientProps {
  user: MarketplaceUser;
  initialSavedAuctions: AuctionItem[];
}

export function SavedItemsClient({
  user,
  initialSavedAuctions,
}: SavedItemsClientProps) {
  const [savedAuctions, setSavedAuctions] = useState<AuctionItem[]>(initialSavedAuctions);
  const homeHref = user.role === 'seller' ? '/seller/home' : '/bidder/home';

  const handleToggleSave = useCallback((auctionId: string, nextSaved: boolean) => {
    if (!nextSaved) {
      setSavedAuctions((prev) => prev.filter((item) => item.id !== auctionId));
    }
  }, []);

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={user} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Saved Watchlist
            </h1>
            <p className="mt-1 text-xs text-white/65">
              Items you bookmarked for live bid monitoring and anti-snipe alerts.
            </p>
          </div>

          <span className="rounded-full border border-white/20 bg-white/[0.05] px-3.5 py-1 text-xs font-medium text-white/85">
            {savedAuctions.length} Saved
          </span>
        </div>

        {savedAuctions.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedAuctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                isSaved={true}
                onToggleSave={handleToggleSave}
                viewerRole={user.role}
                viewerId={user.id}
              />
            ))}
          </div>
        ) : (
          <div className="smoky-glass-card rounded-[34px] border border-white/20 px-6 py-14 text-center backdrop-blur-2xl">
            <Bookmark className="mx-auto h-8 w-8 text-white/45" aria-hidden="true" />
            <h2 className="mt-4 text-base font-semibold text-white">
              Your watchlist is empty
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/60">
              Tap the bookmark icon on any auction card to save items and track countdowns
              here.
            </p>
            <Link
              href={homeHref}
              className="smoky-cta-btn mt-6 inline-flex h-10 items-center justify-center rounded-full px-6 text-xs font-medium text-white"
            >
              Browse Auctions
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
