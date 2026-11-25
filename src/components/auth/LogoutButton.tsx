'use client';

import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { mapAuthError } from '@/lib/auth/errors';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogout() {
    if (inFlightRef.current || isLoading) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace('/login');
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage(mapAuthError(error, 'logout'));
        return;
      }

      router.replace('/login?notice=logged-out');
      router.refresh();
    } catch (err) {
      setErrorMessage(mapAuthError(err, 'logout'));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full">
      {errorMessage ? (
        <div
          role="alert"
          className="mb-3 rounded-2xl border border-rose-300/30 bg-rose-950/55 px-4 py-2 text-center text-xs text-rose-100"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="smoky-cta-btn flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Logging out...</span>
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Log Out</span>
          </>
        )}
      </button>
    </div>
  );
}
