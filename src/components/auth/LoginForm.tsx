'use client';

import { Check, KeyRound, Loader2, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { FrostedInput } from '@/components/auth/FrostedInput';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { verifyCaptchaTokenOnServer } from '@/lib/auth/captcha-client';
import { DEMO_MODE_MESSAGE, mapAuthError } from '@/lib/auth/errors';
import {
  COUNTRY_CODES,
  validateEmail,
  validateOtpCode,
  validatePhoneNumber,
} from '@/lib/auth/validation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const REMEMBERED_EMAIL_KEY = 'snipe_shield_remembered_email';
const OTP_RESEND_SECONDS = 60;

type LoginMethod = 'email' | 'phone';

interface LoginFormProps {
  isDemoMode: boolean;
  initialNotice?: string;
}

export function LoginForm({ isDemoMode, initialNotice }: LoginFormProps) {
  const router = useRouter();
  const inFlightRef = useRef(false);

  const [method, setMethod] = useState<LoginMethod>('email');

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Phone OTP login state
  const [dialCode, setDialCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<{ e164: string; formatted: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  // Shared CAPTCHA & feedback state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(initialNotice ?? null);

  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  function switchMethod(nextMethod: LoginMethod) {
    if (isLoading || nextMethod === method) return;
    setMethod(nextMethod);
    setErrorMessage(null);
    setInfoMessage(null);
    setTurnstileToken(null);
    setTurnstileResetSignal((prev) => prev + 1);
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlightRef.current || isLoading) return;

    setErrorMessage(null);
    setInfoMessage(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.message);
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
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
      const hadToken = Boolean(turnstileToken);
      const captchaCheck = await verifyCaptchaTokenOnServer(turnstileToken);
      if (hadToken) {
        setTurnstileToken(null);
        setTurnstileResetSignal((prev) => prev + 1);
      }
      if (!captchaCheck.verified) {
        setErrorMessage(captchaCheck.error);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailCheck.email,
        password,
      });

      if (error) {
        setErrorMessage(mapAuthError(error, 'login'));
        return;
      }

      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, emailCheck.email);
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // Ignore storage restrictions
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setErrorMessage(mapAuthError(err, 'login'));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }

  async function sendPhoneOtp(targetPhone?: { e164: string; formatted: string }) {
    if (inFlightRef.current || isLoading) return;

    setErrorMessage(null);
    setInfoMessage(null);

    const resolvedPhone =
      targetPhone ??
      (() => {
        const check = validatePhoneNumber(dialCode, phoneInput);
        if (!check.valid) {
          setErrorMessage(check.message);
          return null;
        }
        return { e164: check.e164, formatted: check.formatted };
      })();

    if (!resolvedPhone) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase || isDemoMode) {
      setErrorMessage(DEMO_MODE_MESSAGE);
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const hadToken = Boolean(turnstileToken);
      const captchaCheck = await verifyCaptchaTokenOnServer(turnstileToken);
      if (hadToken) {
        setTurnstileToken(null);
        setTurnstileResetSignal((prev) => prev + 1);
      }
      if (!captchaCheck.verified) {
        setErrorMessage(captchaCheck.error);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: resolvedPhone.e164,
      });

      if (error) {
        setErrorMessage(mapAuthError(error, 'phone_otp'));
        return;
      }

      setOtpSentTo(resolvedPhone);
      setOtpCode('');
      setResendSeconds(OTP_RESEND_SECONDS);
      setInfoMessage(`6-digit OTP sent to ${resolvedPhone.formatted}`);
    } catch (err) {
      setErrorMessage(mapAuthError(err, 'phone_otp'));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }

  async function handlePhoneSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!otpSentTo) {
      await sendPhoneOtp();
      return;
    }

    if (inFlightRef.current || isLoading) return;
    setErrorMessage(null);
    setInfoMessage(null);

    const otpCheck = validateOtpCode(otpCode);
    if (!otpCheck.valid) {
      setErrorMessage(otpCheck.message);
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
      const { error } = await supabase.auth.verifyOtp({
        phone: otpSentTo.e164,
        token: otpCheck.code,
        type: 'sms',
      });

      if (error) {
        setErrorMessage(mapAuthError(error, 'verify_otp'));
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setErrorMessage(mapAuthError(err, 'verify_otp'));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Login Method Toggle (Email vs Phone OTP) */}
      <div className="mb-3.5 flex justify-center">
        <div
          role="tablist"
          aria-label="Login method"
          className="grid w-[212px] grid-cols-2 rounded-full border border-white/20 bg-black/45 p-1 backdrop-blur-md"
        >
          {([
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Phone OTP' },
          ] as const).map((tab) => {
            const active = method === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={isLoading}
                onClick={() => switchMethod(tab.id)}
                className={`h-8 cursor-pointer rounded-full text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
                  active
                    ? 'bg-[#e2e4e8] text-neutral-950 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {method === 'email' ? (
        <form onSubmit={handleEmailSubmit} noValidate className="flex flex-1 flex-col">
          <div className="space-y-3.5">
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

            <FrostedInput
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {/* Remember me & Forgot Password */}
          <div className="mt-3 flex items-center justify-between px-1 text-xs">
            <label className="flex cursor-pointer select-none items-center gap-2 text-white/80 transition hover:text-white">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberMe}
                aria-label="Remember me"
                onClick={() => setRememberMe((prev) => !prev)}
                disabled={isLoading}
                className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-[4px] border border-white/45 bg-white/[0.04] text-white transition hover:border-white/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              >
                {rememberMe ? <Check className="h-3 w-3 stroke-[2.75]" aria-hidden="true" /> : null}
              </button>
              <span>Remember me</span>
            </label>

            <Link
              href="/reset-password"
              className="text-white/80 transition hover:text-white focus:outline-none focus-visible:underline"
            >
              Forgot Password?
            </Link>
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

          {infoMessage ? (
            <div
              role="status"
              className="mt-3.5 rounded-2xl border border-white/20 bg-white/[0.07] px-4 py-2.5 text-center text-xs text-white/90 backdrop-blur-md"
            >
              {infoMessage}
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
                <span>Logging in...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePhoneSubmit} noValidate className="flex flex-1 flex-col">
          {!otpSentTo ? (
            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="phone-number-input"
                  className="mb-1.5 block pl-1 text-xs font-normal tracking-[0.01em] text-white/80"
                >
                  Mobile Number
                </label>

                <div className="flex h-[46px] w-full items-center gap-2 rounded-full border border-white/20 bg-white/[0.045] px-3.5 backdrop-blur-md transition-colors focus-within:border-white/50 focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-white/15">
                  <Phone className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />

                  <select
                    aria-label="Country code"
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    disabled={isLoading}
                    className="shrink-0 cursor-pointer bg-transparent py-1 pr-1 text-xs font-medium leading-none text-white focus:outline-none disabled:cursor-not-allowed"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option
                        key={c.code}
                        value={c.dialCode}
                        className="bg-[#12141a] text-white"
                      >
                        {c.code} {c.dialCode}
                      </option>
                    ))}
                  </select>

                  <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden="true" />

                  <input
                    id="phone-number-input"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/[^\d\s-]/g, ''))}
                    placeholder="Enter mobile number"
                    disabled={isLoading}
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <TurnstileWidget
                onTokenChange={setTurnstileToken}
                resetSignal={turnstileResetSignal}
              />
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1 text-xs text-white/75">
                <span>Sent to {otpSentTo.formatted}</span>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setOtpSentTo(null);
                    setOtpCode('');
                    setErrorMessage(null);
                    setInfoMessage(null);
                    setTurnstileToken(null);
                    setTurnstileResetSignal((prev) => prev + 1);
                  }}
                  className="cursor-pointer font-medium text-white underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Change
                </button>
              </div>

              <div>
                <label
                  htmlFor="otp-code-input"
                  className="mb-1.5 block pl-1 text-xs font-normal tracking-[0.01em] text-white/80"
                >
                  6-Digit OTP
                </label>

                <div className="flex h-[46px] w-full items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.045] px-4 backdrop-blur-md transition-colors focus-within:border-white/50 focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-white/15">
                  <KeyRound className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />

                  <input
                    id="otp-code-input"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    disabled={isLoading}
                    className="h-full min-w-0 flex-1 bg-transparent text-sm tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-white/45 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-white/60">Didn&apos;t receive the code?</span>
                {resendSeconds > 0 ? (
                  <span className="font-medium text-white/70">
                    Resend OTP in {resendSeconds}s
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void sendPhoneOtp(otpSentTo)}
                    className="cursor-pointer font-medium text-white transition hover:underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {resendSeconds === 0 ? (
                <TurnstileWidget
                  onTokenChange={setTurnstileToken}
                  resetSignal={turnstileResetSignal}
                />
              ) : null}
            </div>
          )}

          {errorMessage ? (
            <div
              role="alert"
              className="mt-3.5 rounded-2xl border border-rose-300/25 bg-rose-950/50 px-4 py-2.5 text-center text-xs text-rose-100 backdrop-blur-md"
            >
              {errorMessage}
            </div>
          ) : null}

          {infoMessage ? (
            <div
              role="status"
              className="mt-3.5 rounded-2xl border border-white/20 bg-white/[0.07] px-4 py-2.5 text-center text-xs text-white/90 backdrop-blur-md"
            >
              {infoMessage}
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
                <span>{otpSentTo ? 'Verifying...' : 'Sending OTP...'}</span>
              </>
            ) : (
              <span>{otpSentTo ? 'Verify & Login' : 'Send OTP'}</span>
            )}
          </button>
        </form>
      )}

      <OAuthButtons
        disabled={isLoading}
        onStatusMessage={(msg) => {
          setInfoMessage(null);
          setErrorMessage(msg);
        }}
      />
    </div>
  );
}
