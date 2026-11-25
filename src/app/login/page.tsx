import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { SmokyAuthShell } from '@/components/auth/SmokyAuthShell';
import { isSupabaseConfigured } from '@/lib/supabase/config';

interface LoginPageProps {
  searchParams: Promise<{ notice?: string }>;
}

function resolveNotice(code?: string): string | undefined {
  switch (code) {
    case 'link-invalid':
      return 'That verification or reset link is invalid or has expired. Please request a new one.';
    case 'logged-out':
      return 'You have been logged out safely.';
    case 'demo':
      return 'Supabase is not connected yet. Add your credentials in .env.local to unlock protected pages.';
    default:
      return undefined;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const demoMode = !isSupabaseConfigured();

  return (
    <SmokyAuthShell
      headlineLine1="Log In, Join The"
      headlineLine2="Live Bidding"
      isDemoMode={demoMode}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-white transition hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm isDemoMode={demoMode} initialNotice={resolveNotice(params.notice)} />
    </SmokyAuthShell>
  );
}
