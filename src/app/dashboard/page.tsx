import { Gavel, ShieldCheck, Store, User } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DashboardWelcomeActions } from '@/components/auth/DashboardWelcomeActions';
import { SmokyAuthShell } from '@/components/auth/SmokyAuthShell';
import { normalizeRole } from '@/lib/auth/validation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getInitials(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed || /^\+?\d/.test(trimmed)) return '';
  const local = trimmed.split('@')[0] ?? trimmed;
  return local.charAt(0).toUpperCase();
}

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
  const avatarInitial = getInitials(displayIdentifier);

  return (
    <SmokyAuthShell
      headlineLine1="Welcome To"
      headlineLine2="Snipe Shield"
      compact
      footer={
        <span className="text-white/55">
          Avishkar&apos;26 • Team DedSec • Verified Session
        </span>
      }
    >
      <div className="flex flex-1 flex-col justify-between">
        <div className="space-y-4">
          {/* Verified Session Pill — matching frosted pill aesthetic */}
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1 text-xs font-medium text-white/85 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-[#d5d7db]" aria-hidden="true" />
              Protected Session Active
            </span>
          </div>

          {/* Welcome Identity Card — matching FrostedInput & SmokyAuthShell surfaces */}
          <div className="rounded-3xl border border-white/20 bg-white/[0.045] p-5 backdrop-blur-md">
            <div className="flex items-center gap-3.5">
              {/* Frosted User Avatar */}
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-base font-semibold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md"
              >
                {avatarInitial || <User className="h-5 w-5 text-white/85" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                  {accountLabel}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-white" title={displayIdentifier}>
                  {displayIdentifier}
                </p>
              </div>
            </div>

            <div className="my-4 h-px bg-white/15" />

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                  Account role
                </p>
                <p className="mt-0.5 text-xs text-white/75">
                  {isSeller
                    ? 'Authorized to list live auctions'
                    : 'Authorized to place live bids'}
                </p>
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  isSeller
                    ? 'border-white/40 bg-[#e2e4e8] text-neutral-950 shadow-sm'
                    : 'border-white/25 bg-white/15 text-white'
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

        <DashboardWelcomeActions isSeller={isSeller} />
      </div>
    </SmokyAuthShell>
  );
}
