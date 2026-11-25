'use client';

import { Bookmark, Gavel, Home, Plus, Search, Store, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MarketplaceUser } from '@/lib/marketplace/types';

interface MarketplaceNavbarProps {
  user: MarketplaceUser;
}

export function MarketplaceNavbar({ user }: MarketplaceNavbarProps) {
  const pathname = usePathname();
  const isSeller = user.role === 'seller';
  const homeHref = isSeller ? '/seller/home' : '/bidder/home';
  const savedHref = isSeller ? '/seller/saved' : '/bidder/saved';
  const isOnHome = pathname === '/bidder/home' || pathname === '/seller/home';

  const initial = user.displayName.trim().charAt(0).toUpperCase() || 'S';

  function handleSearchNavClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isOnHome) return;
    const searchEl = document.getElementById('unified-auction-search') as HTMLInputElement | null;
    if (searchEl) {
      e.preventDefault();
      searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchEl.focus({ preventScroll: true });
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-[#090b0f]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Snipe Shield logo & brand */}
        <Link
          href={homeHref}
          prefetch
          className="flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-2 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/snipe-shield-logo.webp"
            alt="Snipe Shield"
            width={32}
            height={32}
            decoding="async"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium italic tracking-tight text-white">
              Snipe Shield
            </span>
            <span
              className={`hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex ${
                isSeller
                  ? 'border-white/35 bg-[#e2e4e8] text-neutral-950'
                  : 'border-white/20 bg-white/10 text-white/90'
              }`}
            >
              {isSeller ? (
                <Store className="h-2.5 w-2.5" aria-hidden="true" />
              ) : (
                <Gavel className="h-2.5 w-2.5" aria-hidden="true" />
              )}
              {isSeller ? 'Seller' : 'Bidder'}
            </span>
          </div>
        </Link>

        {/* Right: Unified Navigation */}
        <nav aria-label="Primary navigation" className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href={homeHref}
            prefetch
            aria-label="Home"
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:px-3.5 ${
              isOnHome
                ? 'border-white/35 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Home</span>
          </Link>

          <Link
            href="/search"
            prefetch
            onClick={handleSearchNavClick}
            aria-label="Search"
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:px-3.5 ${
              pathname === '/search'
                ? 'border-white/35 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Search</span>
          </Link>

          <Link
            href={savedHref}
            prefetch
            aria-label="Saved"
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:px-3.5 ${
              pathname === savedHref
                ? 'border-white/35 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Saved</span>
          </Link>

          {isSeller ? (
            <Link
              href="/seller/create-listing"
              prefetch
              aria-label="Sell New Item"
              className={`smoky-cta-btn flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:px-4 ${
                pathname === '/seller/create-listing' ? 'ring-2 ring-white/40' : ''
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Sell</span>
            </Link>
          ) : null}

          <Link
            href="/profile"
            prefetch
            aria-label="Profile"
            className={`flex h-9 items-center gap-2 rounded-full border pl-1.5 pr-3 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              pathname === '/profile'
                ? 'border-white/40 bg-white/15 text-white'
                : 'border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30 hover:bg-white/[0.09] hover:text-white'
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[11px] font-semibold text-white">
              {initial || <User className="h-3.5 w-3.5" />}
            </span>
            <span className="hidden max-w-[100px] truncate lg:inline">
              {user.displayName}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
