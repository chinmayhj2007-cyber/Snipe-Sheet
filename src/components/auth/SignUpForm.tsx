'use client';

import { Check, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';
import { FrostedInput } from '@/components/auth/FrostedInput';
import { LegalModal, type LegalDocumentType } from '@/components/auth/LegalModal';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { verifyCaptchaTokenOnServer } from '@/lib/auth/captcha-client';
import { DEMO_MODE_MESSAGE, mapAuthError } from '@/lib/auth/errors';
import {
  MIN_PASSWORD_LENGTH,
  type UserRole,
  validateSignUpInput,
} from '@/lib/auth/validation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SignUpFormProps {
  isDemoMode: boolean;
}

export function SignUpForm({ isDemoMode }: SignUpFormProps) {
  const router = useRouter();
  const inFlightRef = useRef(false);

  const [role, setRole] = useState<UserRole>('bidder');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [openLegalDoc, setOpenLegalDoc] = useState<LegalDocumentType | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlightRef.current || isLoading) return;

    setErrorMessage(null);

    const validation = validateSignUpInput({
      email,
      password,
      confirmPassword,
      role,
    });
    if (!validation.valid) {
      setErrorMessage(validation.message);
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Please read and accept the Terms & Conditions before creating an account.');
      return;
    }

    if (!acceptedPrivacy) {
      setErrorMessage('Please read and accept the Privacy Policy before creating an account.');
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
      const captchaCheck = await verifyCaptchaTokenOnServer(turnstileToken);
      setTurnstileResetSignal((prev) => prev + 1);
      if (!captchaCheck.verified) {
        setErrorMessage(captchaCheck.error);
        return;
      }

      const emailRedirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email: validation.email,
        password,
        options: {
          data: {
            role: validation.role,
          },
          emailRedirectTo,
        },
      });

      if (error) {
        setErrorMessage(mapAuthError(error, 'signup'));
        return;
      }

      // If email confirmation is required (default), session is null.
      if (!data.session) {
        setVerificationSentTo(validation.email);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      // If Confirm Email is disabled in Supabase project settings, Supabase signs in immediately.
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setVerificationSentTo(validation.email);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      router.replace('/dashboard?notice=verified');
      router.refresh();
    } catch (err) {
      setErrorMessage(mapAuthError(err, 'signup'));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }

  if (verificationSentTo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-md">
          <CheckCircle2 className="h-7 w-7 text-white" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          Check your email to verify your account
        </h2>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/75">
          We sent a verification link to{' '}
          <span className="font-medium text-white">{verificationSentTo}</span>. Open
          the link in your inbox to activate your{' '}
          <span className="capitalize text-white">{role}</span> account before logging
          in.
        </p>

        <button
          type="button"
          onClick={() => {
            setVerificationSentTo(null);
            router.push('/login');
          }}
          className="smoky-cta-btn mt-7 flex h-12 w-full cursor-pointer items-center justify-center rounded-full text-sm font-medium text-white transition"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
        {/* Bidder / Seller role pill toggle right above Email */}
        <div className="mb-3 flex justify-center">
          <div
            role="radiogroup"
            aria-label="Account role"
            className="grid w-[212px] grid-cols-2 rounded-full border border-white/20 bg-black/45 p-1 backdrop-blur-md"
          >
            {(['bidder', 'seller'] as const).map((option) => {
              const active = role === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isLoading}
                  onClick={() => setRole(option)}
                  className={`h-8 cursor-pointer rounded-full text-xs font-semibold capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
                    active
                      ? 'bg-[#e2e4e8] text-neutral-950 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5">
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

          <div>
            <FrostedInput
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              disabled={isLoading}
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <FrostedInput
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm your password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            disabled={isLoading}
          />
        </div>

        {/* Terms & Conditions + Privacy Policy Checkboxes */}
        <div className="mt-3 space-y-1.5 px-1 text-xs">
          <div className="flex items-start gap-2.5 text-white/80">
            <button
              type="button"
              role="checkbox"
              aria-checked={acceptedTerms}
              aria-label="Accept Terms and Conditions"
              onClick={() => setAcceptedTerms((prev) => !prev)}
              disabled={isLoading}
              className="mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-white/45 bg-white/[0.04] text-white transition hover:border-white/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
            >
              {acceptedTerms ? <Check className="h-3 w-3 stroke-[2.75]" aria-hidden="true" /> : null}
            </button>
            <span className="leading-snug">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setOpenLegalDoc('terms')}
                className="cursor-pointer font-medium text-white underline underline-offset-2 transition hover:text-white/85"
              >
                Terms &amp; Conditions
              </button>
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-white/80">
            <button
              type="button"
              role="checkbox"
              aria-checked={acceptedPrivacy}
              aria-label="Accept Privacy Policy"
              onClick={() => setAcceptedPrivacy((prev) => !prev)}
              disabled={isLoading}
              className="mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-white/45 bg-white/[0.04] text-white transition hover:border-white/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
            >
              {acceptedPrivacy ? <Check className="h-3 w-3 stroke-[2.75]" aria-hidden="true" /> : null}
            </button>
            <span className="leading-snug">
              I accept the{' '}
              <button
                type="button"
                onClick={() => setOpenLegalDoc('privacy')}
                className="cursor-pointer font-medium text-white underline underline-offset-2 transition hover:text-white/85"
              >
                Privacy Policy
              </button>
            </span>
          </div>
        </div>

        <div className="mt-3.5">
          <TurnstileWidget
            onTokenChange={setTurnstileToken}
            resetSignal={turnstileResetSignal}
          />
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-3.5 rounded-2xl border border-rose-300/25 bg-rose-950/50 px-4 py-2.5 text-center text-xs text-rose-100 backdrop-blur-md"
          >
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="smoky-cta-btn mt-4 flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Sign Up</span>
          )}
        </button>

        <OAuthButtons
          disabled={isLoading}
          role={role}
          onStatusMessage={(msg) => setErrorMessage(msg)}
        />
      </form>

      <LegalModal
        documentType={openLegalDoc}
        onClose={() => setOpenLegalDoc(null)}
        onAccept={(doc) => {
          if (doc === 'terms') setAcceptedTerms(true);
          if (doc === 'privacy') setAcceptedPrivacy(true);
        }}
      />
    </>
  );
}
