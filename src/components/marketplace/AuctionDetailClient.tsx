'use client';

import {
  ArrowLeft,
  Bookmark,
  Bot,
  Gavel,
  ShieldCheck,
  Store,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { CountdownTimer } from '@/components/marketplace/CountdownTimer';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import { ShinyButton } from '@/components/ui/shiny-button';
import {
  type AuctionItem,
  type BidEntry,
  formatINR,
  getAuctionPhase,
  type MarketplaceUser,
} from '@/lib/marketplace/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuctionDetailClientProps {
  user: MarketplaceUser;
  initialAuction: AuctionItem;
  initialBids: BidEntry[];
  initialSaved: boolean;
  initialMyProxyMax: number | null;
}

export function AuctionDetailClient({
  user,
  initialAuction,
  initialBids,
  initialSaved,
  initialMyProxyMax,
}: AuctionDetailClientProps) {
  const bidInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const [auction, setAuction] = useState<AuctionItem>(initialAuction);
  const [bids, setBids] = useState<BidEntry[]>(initialBids);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [myProxyMax, setMyProxyMax] = useState<number | null>(initialMyProxyMax);

  const gallery =
    auction.image_urls.length > 0
      ? auction.image_urls
      : auction.image_url
        ? [auction.image_url]
        : [];
  const [selectedImage, setSelectedImage] = useState<string | null>(gallery[0] ?? null);

  const minNextBid = auction.highest_bidder_id
    ? auction.current_price + auction.min_increment
    : auction.starting_price;

  const [bidAmount, setBidAmount] = useState(String(minNextBid));
  const [enableProxy, setEnableProxy] = useState(false);
  const [proxyMaxInput, setProxyMaxInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setBidAmount(String(minNextBid));
  }, [minNextBid]);

  // Real-time WebSocket subscription for live bids & anti-snipe extensions
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`auction-room-${auction.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auction.id}`,
        },
        (payload) => {
          const row = payload.new as Partial<AuctionItem>;
          setAuction((prev) => ({
            ...prev,
            current_price: Number(row.current_price ?? prev.current_price),
            highest_bidder_id: row.highest_bidder_id ?? prev.highest_bidder_id,
            ends_at: row.ends_at ?? prev.ends_at,
            status: (row.status as AuctionItem['status']) ?? prev.status,
            extensions_count: Number(row.extensions_count ?? prev.extensions_count),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auction.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            auction_id: string;
            bidder_id: string;
            amount: number;
            is_auto_proxy: boolean;
            created_at: string;
          };
          setBids((prev) => {
            if (prev.some((b) => b.id === row.id)) return prev;
            const entry: BidEntry = {
              id: row.id,
              auction_id: row.auction_id,
              bidder_id: row.bidder_id,
              bidder_name: row.bidder_id === user.id ? 'You' : 'Live Bidder',
              amount: Number(row.amount),
              is_auto_proxy: Boolean(row.is_auto_proxy),
              created_at: row.created_at,
            };
            return [entry, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auction.id, user.id]);

  async function handleToggleSave() {
    if (saveInFlightRef.current || savingWatchlist) return;
    saveInFlightRef.current = true;
    setSavingWatchlist(true);
    const prev = isSaved;
    setIsSaved(!prev);
    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id }),
      });
      if (res.ok) {
        const data = (await res.json()) as { saved: boolean };
        setIsSaved(data.saved);
      } else {
        setIsSaved(prev);
      }
    } catch {
      setIsSaved(prev);
    } finally {
      saveInFlightRef.current = false;
      setSavingWatchlist(false);
    }
  }

  async function handlePlaceBid(e?: FormEvent) {
    e?.preventDefault();
    if (bidInFlightRef.current || submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const amountNum = Number(bidAmount);
    const proxyNum = enableProxy && proxyMaxInput.trim() ? Number(proxyMaxInput) : null;

    if (!Number.isFinite(amountNum) || amountNum < minNextBid) {
      setErrorMessage(`Bid must be at least ${formatINR(minNextBid)}.`);
      return;
    }

    if (proxyNum !== null && (!Number.isFinite(proxyNum) || proxyNum < amountNum)) {
      setErrorMessage('Auto-proxy max ceiling must be equal to or higher than your bid.');
      return;
    }

    bidInFlightRef.current = true;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          maxProxy: proxyNum,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        is_leading?: boolean;
        current_price?: number;
        highest_bidder_id?: string;
        ends_at?: string;
        extended?: boolean;
      };

      if (!res.ok) {
        setErrorMessage(data.error ?? 'Could not place bid.');
        return;
      }

      if (proxyNum !== null) {
        setMyProxyMax(proxyNum);
      }

      setAuction((prev) => ({
        ...prev,
        current_price: Number(data.current_price ?? prev.current_price),
        highest_bidder_id: data.highest_bidder_id ?? prev.highest_bidder_id,
        ends_at: data.ends_at ?? prev.ends_at,
        extensions_count: data.extended ? prev.extensions_count + 1 : prev.extensions_count,
      }));

      if (data.is_leading) {
        setSuccessMessage(
          data.extended
            ? 'You are now the highest bidder! Anti-sniping extended timer by 30 seconds.'
            : 'Bid placed! You are currently the highest bidder.'
        );
      } else {
        setSuccessMessage(
          `Another bidder's auto-proxy outbid your offer. Current price is ${formatINR(
            Number(data.current_price ?? minNextBid)
          )}.`
        );
      }
    } catch {
      setErrorMessage('Network error while submitting bid.');
    } finally {
      bidInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  const phase = getAuctionPhase(auction);
  const backHref = user.role === 'seller' ? '/seller/home' : '/bidder/home';
  const isLeading = auction.highest_bidder_id === user.id;
  const isOwnListing = auction.seller_id === user.id;

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={user} />

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md transition hover:border-white/35 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Marketplace
          </Link>

          <button
            type="button"
            onClick={handleToggleSave}
            disabled={savingWatchlist}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md transition ${
              isSaved
                ? 'border-white/45 bg-[#e2e4e8] text-neutral-950'
                : 'border-white/20 bg-white/[0.05] text-white hover:border-white/40'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save Item'}
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Left Column: Gallery + Description */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-white/20 bg-[#0b0c10] backdrop-blur-xl">
              <div className="aspect-[16/11] w-full overflow-hidden">
                {selectedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedImage}
                    alt={auction.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#171a21] to-[#08090c]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/snipe-shield-logo.webp"
                      alt="Snipe Shield"
                      className="h-24 w-24 object-contain opacity-70"
                    />
                  </div>
                )}
              </div>

              {gallery.length > 1 ? (
                <div className="flex gap-2.5 overflow-x-auto border-t border-white/10 p-3">
                  {gallery.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedImage(url)}
                      className={`relative h-16 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border transition ${
                        selectedImage === url
                          ? 'border-white ring-2 ring-white/30'
                          : 'border-white/15 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <section className="rounded-[28px] border border-white/15 bg-white/[0.035] p-6 backdrop-blur-xl">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                Item Details
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/80">
                {auction.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-white/50">Category</span>
                  <p className="mt-0.5 font-medium text-white">{auction.category}</p>
                </div>
                <div>
                  <span className="text-white/50">Condition</span>
                  <p className="mt-0.5 font-medium text-white">{auction.condition}</p>
                </div>
                <div>
                  <span className="text-white/50">Seller</span>
                  <p className="mt-0.5 font-medium text-white">{auction.seller_name}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Live Bid Engine + History */}
          <div className="space-y-6">
            <section className="smoky-glass-card rounded-[34px] border border-white/20 p-6 backdrop-blur-2xl sm:p-7">
              <div className="relative z-10 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/85">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Anti-Snipe Protected
                    {auction.extensions_count > 0
                      ? ` (${auction.extensions_count}x extended)`
                      : ''}
                  </span>

                  <CountdownTimer
                    startsAt={auction.starts_at}
                    endsAt={auction.ends_at}
                    status={auction.status}
                  />
                </div>

                <h1 className="text-2xl font-semibold leading-snug tracking-tight text-white">
                  {auction.title}
                </h1>

                <div className="rounded-3xl border border-white/20 bg-white/[0.05] p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                        {auction.highest_bidder_id ? 'Current Highest Bid' : 'Starting Price'}
                      </p>
                      <p className="mt-0.5 text-3xl font-semibold tracking-tight text-white">
                        {formatINR(auction.current_price)}
                      </p>
                    </div>

                    {isLeading ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/35 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-200">
                        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                        You&apos;re Leading
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-xs text-white/65">
                    <span>Min Increment: {formatINR(auction.min_increment)}</span>
                    <span>Next Min Bid: {formatINR(minNextBid)}</span>
                  </div>
                </div>

                {/* Role-based Bidding Panel */}
                {user.role === 'bidder' && !isOwnListing ? (
                  phase === 'live' ? (
                    <form onSubmit={handlePlaceBid} className="space-y-3.5">
                      <div>
                        <label
                          htmlFor="bid-amount-input"
                          className="mb-1.5 block pl-1 text-xs font-medium text-white/80"
                        >
                          Your Bid Amount (₹)
                        </label>
                        <input
                          id="bid-amount-input"
                          type="number"
                          min={minNextBid}
                          step="1"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          disabled={submitting}
                          className="h-[46px] w-full rounded-full border border-white/20 bg-white/[0.05] px-4 text-sm font-medium text-white focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/15"
                        />
                      </div>

                      {/* Auto-Proxy Toggle */}
                      <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-3.5">
                        <label className="flex cursor-pointer items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-2 font-medium text-white/85">
                            <Bot className="h-4 w-4 text-[#d5d7db]" aria-hidden="true" />
                            Enable Auto-Proxy Max Ceiling
                          </span>
                          <input
                            type="checkbox"
                            checked={enableProxy}
                            onChange={(e) => setEnableProxy(e.target.checked)}
                            className="h-4 w-4 accent-white"
                          />
                        </label>

                        {enableProxy ? (
                          <div className="mt-3">
                            <input
                              type="number"
                              min={Number(bidAmount) || minNextBid}
                              step="1"
                              value={proxyMaxInput}
                              onChange={(e) => setProxyMaxInput(e.target.value)}
                              placeholder="Enter secret max bid ceiling (₹)"
                              className="h-10 w-full rounded-full border border-white/20 bg-black/35 px-4 text-xs text-white placeholder:text-white/40 focus:border-white/45 focus:outline-none"
                            />
                            <p className="mt-1.5 text-[11px] text-white/55">
                              Automatically outbids competitors up to your ceiling by{' '}
                              {formatINR(auction.min_increment)}.
                            </p>
                          </div>
                        ) : myProxyMax ? (
                          <p className="mt-1.5 text-[11px] text-white/60">
                            Active hidden proxy ceiling: {formatINR(myProxyMax)}
                          </p>
                        ) : null}
                      </div>

                      {errorMessage ? (
                        <div
                          role="alert"
                          className="rounded-2xl border border-rose-300/25 bg-rose-950/50 px-4 py-2.5 text-center text-xs text-rose-100"
                        >
                          {errorMessage}
                        </div>
                      ) : null}

                      {successMessage ? (
                        <div
                          role="status"
                          className="rounded-2xl border border-emerald-300/25 bg-emerald-950/50 px-4 py-2.5 text-center text-xs text-emerald-100"
                        >
                          {successMessage}
                        </div>
                      ) : null}

                      <ShinyButton
                        label={submitting ? 'Placing Bid...' : `Place Bid (${formatINR(Number(bidAmount) || minNextBid)})`}
                        onClick={() => void handlePlaceBid()}
                        fillColor="#0b0c10"
                        labelColor="#ffffff"
                        accentColor="#a7adb6"
                        accentSoftColor="#e2e4e8"
                        cornerRadius={9999}
                        speckleOpacity={0.28}
                        className="flex h-[46px] w-full items-center justify-center !p-0 !text-sm !font-medium shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                      />
                    </form>
                  ) : (
                    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-center text-xs text-white/75">
                      {phase === 'upcoming'
                        ? 'This auction has not opened for bidding yet.'
                        : 'This auction has closed. Bidding is no longer active.'}
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-xs text-white/75">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <Store className="h-4 w-4" aria-hidden="true" />
                      <span>Seller View Mode</span>
                    </div>
                    <p className="mt-1.5 text-white/65">
                      {isOwnListing
                        ? `This is your live listing.${
                            auction.reserve_price !== null
                              ? ` Hidden Reserve: ${formatINR(auction.reserve_price)}.`
                              : ''
                          }`
                        : 'Seller accounts monitor live market auctions in read-only mode.'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Live Bid History */}
            <section className="rounded-[28px] border border-white/15 bg-white/[0.035] p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Gavel className="h-4 w-4 text-[#d5d7db]" aria-hidden="true" />
                  Live Bid History
                </h2>
                <span className="text-xs text-white/55">{bids.length} total</span>
              </div>

              {bids.length > 0 ? (
                <ul className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {bids.map((bid, idx) => (
                    <li
                      key={bid.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-xs ${
                        idx === 0
                          ? 'border-white/30 bg-white/[0.08]'
                          : 'border-white/10 bg-white/[0.025]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-white">
                            {bid.bidder_name}
                          </span>
                          {bid.is_auto_proxy ? (
                            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/80">
                              Auto-Proxy
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[10px] text-white/50">
                          {new Date(bid.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      <span className="font-semibold text-white">
                        {formatINR(bid.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-center text-xs text-white/55">
                  No bids placed yet. Be the first to bid!
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
