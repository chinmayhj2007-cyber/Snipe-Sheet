import Link from 'next/link';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { SmokyAuthShell } from '@/components/auth/SmokyAuthShell';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  const demoMode = !isSupabaseConfigured();

  return (
    <SmokyAuthShell
      headlineLine1="Start Here, Create"
      headlineLine2="Your Account"
      isDemoMode={demoMode}
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-white transition hover:underline"
          >
            Login
          </Link>
        </>
      }
    >
      <SignUpForm isDemoMode={demoMode} />
    </SmokyAuthShell>
  );
}
