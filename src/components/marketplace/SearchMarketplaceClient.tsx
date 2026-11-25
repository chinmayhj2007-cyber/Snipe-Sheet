'use client';

import { useCallback, useState } from 'react';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import { UnifiedSearchBar } from '@/components/marketplace/UnifiedSearchBar';
import type { AuctionItem, MarketplaceUser } from '@/lib/marketplace/types';

interface SearchMarketplaceClientProps {
  user: MarketplaceUser;
  initialAuctions: AuctionItem[];
  initialSavedIds: string[];
  initialQuery?: string;
  initialCategory?: string;
}

export function SearchMarketplaceClient({
  user,
  initialAuctions,
  initialSavedIds,
  initialQuery = '',
  initialCategory = 'All',
}: SearchMarketplaceClientProps) {
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(initialSavedIds));

  const handleToggleSave = useCallback((auctionId: string, nextSaved: boolean) => {
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(auctionId);
      else next.delete(auctionId);
      return next;
    });
  }, []);

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={user} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="smoky-glass-card rounded-[34px] border border-white/20 p-6 sm:p-8">
          <h1 className="mb-4 text-2xl font-semibold tracking-tight text-white">
            Search Auctions
          </h1>

          <UnifiedSearchBar
            auctions={initialAuctions}
            savedSet={savedSet}
            onToggleSave={handleToggleSave}
            viewerRole={user.role}
            viewerId={user.id}
            initialQuery={initialQuery}
            initialCategory={initialCategory}
            alwaysShowResults
          />
        </section>
      </main>
    </div>
  );
}
