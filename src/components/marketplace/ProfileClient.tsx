'use client';

import { Gavel, Loader2, ShieldCheck, Store, User } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import type { MarketplaceUser } from '@/lib/marketplace/types';

interface ProfileClientProps {
  user: MarketplaceUser;
  stats: {
    savedCount: number;
    activityCount: number;
  };
}

export function ProfileClient({ user, stats }: ProfileClientProps) {
  const [fullName, setFullName] = useState(user.fullName || user.displayName);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSeller = user.role === 'seller';
  const initial = (fullName.trim() || user.displayName).charAt(0).toUpperCase();

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setErrorMessage('Display name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmed }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(data.error ?? 'Could not save profile.');
        return;
      }

      setStatusMessage('Display name updated cleanly.');
    } catch {
      setErrorMessage('Network error while updating profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={{ ...user, displayName: fullName.trim() || user.displayName }} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <section className="smoky-glass-card rounded-[34px] border border-white/20 p-6 backdrop-blur-2xl sm:p-8">
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xl font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-md">
                {initial || <User className="h-6 w-6" />}
              </div>

              <div className="mt-3 min-w-0 flex-1 sm:ml-4 sm:mt-0">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="truncate text-xl font-semibold text-white">
                    {fullName.trim() || user.displayName}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      isSeller
                        ? 'border-white/40 bg-[#e2e4e8] text-neutral-950'
                        : 'border-white/25 bg-white/15 text-white'
                    }`}
                  >
                    {isSeller ? (
                      <Store className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Gavel className="h-3 w-3" aria-hidden="true" />
                    )}
                    {isSeller ? 'Seller' : 'Bidder'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-white/65">
                  {user.email || user.phone}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-white/55">
                  {isSeller ? 'Listings Created' : 'Bids Placed'}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {stats.activityCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-white/55">
                  Saved Items
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {stats.savedCount}
                </p>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="profile-display-name"
                  className="mb-1.5 block pl-1 text-xs font-medium text-white/80"
                >
                  Display Name
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={80}
                  className="h-[46px] w-full rounded-full border border-white/20 bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/15"
                />
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3 text-xs text-white/65">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#d5d7db]" aria-hidden="true" />
                <span>
                  Account role ({isSeller ? 'Seller' : 'Bidder'}) is locked by server-side
                  Row Level Security.
                </span>
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-300/25 bg-rose-950/50 px-4 py-2.5 text-center text-xs text-rose-100"
                >
                  {errorMessage}
                </div>
              ) : null}

              {statusMessage ? (
                <div
                  role="status"
                  className="rounded-2xl border border-emerald-300/25 bg-emerald-950/50 px-4 py-2.5 text-center text-xs text-emerald-100"
                >
                  {statusMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="smoky-cta-btn flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </form>

            <div className="border-t border-white/15 pt-4">
              <LogoutButton variant="secondary" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
