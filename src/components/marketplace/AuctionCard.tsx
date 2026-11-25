'use client';

import { ArrowUpRight, Bookmark, Gavel } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useRef, useState } from 'react';
import { CountdownTimer } from '@/components/marketplace/CountdownTimer';
import {
  type AuctionItem,
  formatINR,
  getAuctionPhase,
  getPrimaryImage,
} from '@/lib/marketplace/types';

interface AuctionCardProps {
  auction: AuctionItem;
  isSaved: boolean;
  onToggleSave?: (auctionId: string, nextSaved: boolean) => void;
  viewerRole: 'bidder' | 'seller';
  viewerId?: string;
}

export const AuctionCard = memo(function AuctionCard({
  auction,
  isSaved,
  onToggleSave,
  viewerRole,
  viewerId,
}: AuctionCardProps) {
  const inFlightRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [localSaved, setLocalSaved] = useState(isSaved);

  useEffect(() => {
    setLocalSaved(isSaved);
  }, [isSaved]);

  const phase = getAuctionPhase(auction);
  const imageUrl = getPrimaryImage(auction);
  const isOwnListing = viewerId === auction.seller_id;

  async function handleSaveToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inFlightRef.current || saving) return;
    inFlightRef.current = true;
    setSaving(true);

    // Optimistic toggle for immediate tactile response
    const previous = localSaved;
    setLocalSaved(!previous);

    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id }),
      });
      if (res.ok) {
        const data = (await res.json()) as { saved: boolean };
        setLocalSaved(data.saved);
        onToggleSave?.(auction.id, data.saved);
      } else {
        setLocalSaved(previous);
      }
    } catch {
      setLocalSaved(previous);
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/18 bg-[#0e1015]/90 transition-[border-color,background-color,box-shadow] duration-200 hover:border-white/35 hover:bg-[#13161d]/95 hover:shadow-[0_18px_42px_rgba(0,0,0,0.55)]">
      {/* Image Header */}
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-[#0b0c10]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={auction.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#171a21] to-[#08090c]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/snipe-shield-logo.webp"
              alt="Snipe Shield"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              className="h-16 w-16 object-contain opacity-65"
            />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                phase === 'live'
                  ? 'border-emerald-300/35 bg-emerald-950/85 text-emerald-200'
                  : phase === 'upcoming'
                    ? 'border-white/25 bg-black/75 text-white/85'
                    : 'border-white/15 bg-black/80 text-white/55'
              }`}
            >
              {phase === 'live' ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              ) : null}
              {phase === 'live' ? 'Live' : phase === 'upcoming' ? 'Upcoming' : 'Ended'}
            </span>

            <span className="rounded-full border border-white/20 bg-black/75 px-2.5 py-0.5 text-[10px] font-medium text-white/80">
              {auction.condition}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveToggle}
            disabled={saving}
            aria-label={localSaved ? 'Remove from saved items' : 'Save auction item'}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
              localSaved
                ? 'border-white/50 bg-[#e2e4e8] text-neutral-950'
                : 'border-white/20 bg-black/70 text-white/80 hover:border-white/40 hover:text-white'
            }`}
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${localSaved ? 'fill-current' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-white/55">
            <span className="truncate">{auction.category}</span>
            <span>{auction.bid_count ?? 0} bids</span>
          </div>

          <Link href={`/auctions/${auction.id}`} prefetch className="mt-1.5 block">
            <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-white transition group-hover:text-[#e2e4e8]">
              {auction.title}
            </h3>
          </Link>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/60">
            {auction.description}
          </p>
        </div>

        <div className="mt-4 space-y-3 border-t border-white/10 pt-3.5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                {auction.highest_bidder_id ? 'Current Bid' : 'Starting Bid'}
              </p>
              <p className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                {formatINR(auction.current_price)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                Time Left
              </p>
              <div className="mt-0.5">
                <CountdownTimer
                  startsAt={auction.starts_at}
                  endsAt={auction.ends_at}
                  status={auction.status}
                  compact
                />
              </div>
            </div>
          </div>

          <Link
            href={`/auctions/${auction.id}`}
            prefetch
            className="smoky-cta-btn flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-xs font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            {viewerRole === 'bidder' && !isOwnListing && phase === 'live' ? (
              <>
                <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Place Bid</span>
              </>
            ) : (
              <>
                <span>{isOwnListing ? 'Manage / View Live' : 'View Auction'}</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </Link>
        </div>
      </div>
    </article>
  );
});
