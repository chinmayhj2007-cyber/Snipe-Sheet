import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { SmokyAuthShell } from '@/components/auth/SmokyAuthShell';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const demoMode = !isSupabaseConfigured();

  return (
    <SmokyAuthShell
      headlineLine1="Reset Password"
      headlineLine2="To Keep Bidding"
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
      <ResetPasswordForm isDemoMode={demoMode} />
    </SmokyAuthShell>
  );
}
