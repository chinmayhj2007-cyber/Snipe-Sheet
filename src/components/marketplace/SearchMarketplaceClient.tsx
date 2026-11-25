'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AuctionCard } from '@/components/marketplace/AuctionCard';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import {
  AUCTION_CATEGORIES,
  AUCTION_CONDITIONS,
  type AuctionItem,
  getAuctionPhase,
  type MarketplaceUser,
} from '@/lib/marketplace/types';

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
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory || 'All');
  const [condition, setCondition] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'ending' | 'newest' | 'price_asc' | 'price_desc'>('ending');
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(initialSavedIds));

  function handleToggleSave(auctionId: string, nextSaved: boolean) {
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(auctionId);
      else next.delete(auctionId);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    const list = initialAuctions.filter((item) => {
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (category !== 'All' && item.category !== category) return false;
      if (condition !== 'All' && item.condition !== condition) return false;
      if (statusFilter !== 'all' && getAuctionPhase(item, now) !== statusFilter) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.current_price - b.current_price;
      if (sortBy === 'price_desc') return b.current_price - a.current_price;
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
    });
  }, [initialAuctions, query, category, condition, statusFilter, sortBy]);

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={user} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="smoky-glass-card rounded-[34px] border border-white/20 p-6 backdrop-blur-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Search Auctions
          </h1>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.6fr_repeat(4,1fr)]">
            <div className="flex h-11 items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.05] px-4 backdrop-blur-md">
              <Search className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keyword, brand, model..."
                aria-label="Search keyword"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>

            <select
              aria-label="Category filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-full border border-white/20 bg-white/[0.05] px-4 text-xs text-white focus:outline-none"
            >
              <option value="All" className="bg-[#101217] text-white">
                All Categories
              </option>
              {AUCTION_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#101217] text-white">
                  {c.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Condition filter"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="h-11 rounded-full border border-white/20 bg-white/[0.05] px-4 text-xs text-white focus:outline-none"
            >
              <option value="All" className="bg-[#101217] text-white">
                All Conditions
              </option>
              {AUCTION_CONDITIONS.map((cond) => (
                <option key={cond} value={cond} className="bg-[#101217] text-white">
                  {cond}
                </option>
              ))}
            </select>

            <select
              aria-label="Auction status filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'live' | 'upcoming' | 'ended')
              }
              className="h-11 rounded-full border border-white/20 bg-white/[0.05] px-4 text-xs text-white focus:outline-none"
            >
              <option value="all" className="bg-[#101217] text-white">
                All Statuses
              </option>
              <option value="live" className="bg-[#101217] text-white">
                Live Now
              </option>
              <option value="upcoming" className="bg-[#101217] text-white">
                Upcoming
              </option>
              <option value="ended" className="bg-[#101217] text-white">
                Ended
              </option>
            </select>

            <select
              aria-label="Sort order"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'ending' | 'newest' | 'price_asc' | 'price_desc')
              }
              className="h-11 rounded-full border border-white/20 bg-white/[0.05] px-4 text-xs text-white focus:outline-none"
            >
              <option value="ending" className="bg-[#101217] text-white">
                Ending Soonest
              </option>
              <option value="newest" className="bg-[#101217] text-white">
                Newest Listed
              </option>
              <option value="price_asc" className="bg-[#101217] text-white">
                Price: Low to High
              </option>
              <option value="price_desc" className="bg-[#101217] text-white">
                Price: High to Low
              </option>
            </select>
          </div>
        </section>

        <div className="flex items-center justify-between text-xs text-white/60">
          <span>
            Showing {filtered.length} {filtered.length === 1 ? 'auction' : 'auctions'}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                isSaved={savedSet.has(auction.id)}
                onToggleSave={handleToggleSave}
                viewerRole={user.role}
                viewerId={user.id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/15 bg-white/[0.03] px-6 py-12 text-center">
            <p className="text-sm font-medium text-white/80">
              No auctions matched your current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('All');
                setCondition('All');
                setStatusFilter('all');
              }}
              className="mt-4 cursor-pointer rounded-full border border-white/20 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white hover:border-white/40"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
