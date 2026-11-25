import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { SmokyAuthShell } from '@/components/auth/SmokyAuthShell';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ResetPasswordPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const demoMode = !isSupabaseConfigured();

  let hasSession = false;
  if (!demoMode) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      hasSession = Boolean(user);
    }
  }

  const requestedUpdate = params.mode === 'update';
  const initialMode: 'request' | 'update' =
    requestedUpdate && hasSession ? 'update' : 'request';
  const expiredNotice =
    requestedUpdate && !hasSession && !demoMode
      ? 'Your password reset link is invalid or has expired. Please request a new reset link below.'
      : undefined;

  return (
    <SmokyAuthShell
      headlineLine1={initialMode === 'update' ? 'Set A New' : 'Reset Password'}
      headlineLine2={initialMode === 'update' ? 'Account Password' : 'To Keep Bidding'}
      showBackToLogin
      compact
      isDemoMode={demoMode}
      footer={
        <>
          Remembered your password?{' '}
          <Link
            href="/login"
            className="font-semibold text-white transition hover:underline"
          >
            Back to Login
          </Link>
        </>
      }
    >
      <ResetPasswordForm
        isDemoMode={demoMode}
        initialMode={initialMode}
        initialNotice={expiredNotice}
      />
    </SmokyAuthShell>
  );
}
