'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useRef, useState } from 'react';
import { FrostedInput } from '@/components/auth/FrostedInput';
import { DEMO_MODE_MESSAGE, isRateLimitError, mapAuthError } from '@/lib/auth/errors';
import { validateEmail } from '@/lib/auth/validation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ResetPasswordFormProps {
  isDemoMode: boolean;
}

export function ResetPasswordForm({ isDemoMode }: ResetPasswordFormProps) {
  const inFlightRef = useRef(false);

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlightRef.current || isLoading) return;

    setErrorMessage(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.message);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || isDemoMode) {
      setErrorMessage(DEMO_MODE_MESSAGE);
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        emailCheck.email,
        { redirectTo }
      );

      if (error && isRateLimitError(error)) {
        setErrorMessage(mapAuthError(error, 'reset'));
        return;
      }

      // Never reveal whether an email exists in the system.
      setSentEmail(emailCheck.email);
    } catch (err) {
      if (isRateLimitError(err)) {
        setErrorMessage(mapAuthError(err, 'reset'));
      } else {
        setErrorMessage(mapAuthError(err, 'reset'));
      }
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }

  if (sentEmail) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-md">
          <CheckCircle2 className="h-7 w-7 text-white" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          Check your email
        </h2>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/75">
          If an account exists for{' '}
          <span className="font-medium text-white">{sentEmail}</span>, a password
          reset link is on its way.
        </p>

        <Link
          href="/login"
          className="smoky-cta-btn mt-7 flex h-12 w-full items-center justify-center rounded-full text-sm font-medium text-white transition"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="my-auto flex flex-col py-4">
      <div className="space-y-4">
        <FrostedInput
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="Enter your email"
          autoComplete="email"
          disabled={isLoading}
        />
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-950/50 px-4 py-2.5 text-center text-xs text-rose-100 backdrop-blur-md"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="smoky-cta-btn mt-5 flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Sending link...</span>
          </>
        ) : (
          <span>Send Reset Link</span>
        )}
      </button>
    </form>
  );
}
