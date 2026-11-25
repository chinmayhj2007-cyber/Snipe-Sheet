import { BadgeCheck, Calendar, ShieldCheck, Star, Store } from 'lucide-react';
import { notFound } from 'next/navigation';
import { AuctionCard } from '@/components/marketplace/AuctionCard';
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar';
import { computeTrustScore } from '@/lib/marketplace/intelligence';
import {
  fetchSellerPublicProfile,
  requireAuthenticatedUser,
} from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

interface SellerProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function SellerProfilePage({ params }: SellerProfilePageProps) {
  const { id } = await params;
  const { supabase, user } = await requireAuthenticatedUser();
  const { profile, listings, reviews, completedSalesCount, disputeCount } =
    await fetchSellerPublicProfile(supabase, id);

  if (!profile) {
    notFound();
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  const trust = computeTrustScore({
    verificationStatus: profile.verificationStatus,
    completedSales: completedSalesCount,
    avgRating,
    reviewCount: reviews.length,
    disputeCount,
  });

  return (
    <div className="smoky-ambient-page min-h-dvh text-white">
      <MarketplaceNavbar user={user} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <section className="smoky-glass-card rounded-[34px] border border-white/20 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-2xl font-semibold">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-white">{profile.displayName}</h1>
                  {profile.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-950/60 px-3 py-0.5 text-xs font-semibold text-emerald-200">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified Seller
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs text-white/75">
                      <Store className="h-3 w-3" />
                      {profile.verificationStatus.replace('_', ' ')}
                    </span>
                  )}
                  {profile.isDemo ? (
                    <span className="rounded-full border border-amber-300/35 bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                      DEMO ACCOUNT
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 flex items-center gap-2 text-xs text-white/60">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since{' '}
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : 'SnipeShield Launch'}
                  &bull; {completedSalesCount} Completed Sales
                </p>
              </div>
            </div>

            {/* TrustScore Card */}
            <div className="rounded-3xl border border-white/20 bg-black/40 p-4 text-center sm:min-w-[200px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
                SnipeShield TrustScore
              </p>
              <p className="mt-1 text-3xl font-bold text-white">{trust.score}/100</p>
              <p className="text-xs font-medium text-emerald-300">{trust.tier}</p>
            </div>
          </div>

          {/* Transparent Trust Factors */}
          <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trust.factors.map((f) => (
              <div
                key={f.label}
                className="rounded-2xl border border-white/15 bg-white/[0.04] p-3.5 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{f.label}</span>
                  <span>
                    {f.points}/{f.maxPoints}
                  </span>
                </div>
                <p className="mt-1 capitalize text-[11px] text-white/60">{f.status}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Active & Past Listings */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Seller Listings ({listings.length})</h2>
          {listings.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((item) => (
                <AuctionCard
                  key={item.id}
                  auction={item}
                  isSaved={false}
                  viewerRole={user.role}
                  viewerId={user.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/55">No public listings from this seller yet.</p>
          )}
        </section>

        {/* Reviews */}
        <section className="rounded-[28px] border border-white/15 bg-white/[0.035] p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Buyer Reviews ({reviews.length})
            </h2>
            {reviews.length > 0 ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-200">
                <Star className="h-3.5 w-3.5 fill-current" />
                {avgRating.toFixed(1)} / 5.0
              </span>
            ) : null}
          </div>

          {reviews.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {r.reviewer_name}
                      {r.is_demo ? ' (Simulated DEMO)' : ''}
                    </span>
                    <span className="text-amber-300">{'★'.repeat(r.rating)}</span>
                  </div>
                  <p className="mt-1 text-white/75">{r.comment}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-white/55">No buyer reviews submitted yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
