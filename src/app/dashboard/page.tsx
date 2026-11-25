import { Gavel, ShieldCheck, Store } from 'lucide-react';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { SmokyAuthShell } from '@/components/auth/SmokyAuthShell';
import { normalizeRole } from '@/lib/auth/validation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect('/login?notice=demo');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const displayIdentifier = profile?.email || user.email || user.phone || 'Authenticated User';
  const accountLabel = profile?.email || user.email ? 'Signed in email' : 'Signed in mobile';
  const role = normalizeRole(profile?.role ?? user.user_metadata?.role);
  const isSeller = role === 'seller';

  return (
    <SmokyAuthShell
      headlineLine1="Welcome To"
      headlineLine2="Snipe Shield"
      compact
      footer={
        <span className="text-white/55">
          Avishkar&apos;26 • Team DedSec • Step 1 Auth Verified
        </span>
      }
    >
      <div className="flex flex-1 flex-col justify-between">
        <div className="space-y-4">
          {/* Verified Session Pill */}
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-200 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Protected Session Active
            </span>
          </div>

          {/* Account Card */}
          <div className="rounded-3xl border border-white/25 bg-white/[0.06] p-5 backdrop-blur-md">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                  {accountLabel}
                </p>
                <p className="mt-1 break-all text-sm font-medium text-white">
                  {displayIdentifier}
                </p>
              </div>

              <div className="h-px bg-white/15" />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                    Account role
                  </p>
                  <p className="mt-0.5 text-xs text-white/75">
                    {isSeller
                      ? 'Authorized to list auctions in next step'
                      : 'Authorized to place live bids in next step'}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                    isSeller
                      ? 'border-white/40 bg-[#d5d7db] text-neutral-950'
                      : 'border-white/30 bg-white/15 text-white'
                  }`}
                >
                  {isSeller ? (
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{isSeller ? 'Seller' : 'Bidder'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </SmokyAuthShell>
  );
}
