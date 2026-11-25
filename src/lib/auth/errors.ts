type AuthAction =
  | 'login'
  | 'signup'
  | 'reset'
  | 'oauth_google'
  | 'oauth_apple'
  | 'logout'
  | 'phone_otp'
  | 'verify_otp';

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
}

export const DEMO_MODE_MESSAGE =
  "Supabase isn't connected yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable live authentication.";

export const RATE_LIMIT_MESSAGE = 'Too busy right now, try again in a second.';

function extractErrorDetails(error: unknown): { code: string; message: string; status?: number } {
  if (!error || typeof error !== 'object') {
    return { code: '', message: '' };
  }
  const err = error as SupabaseLikeError;
  return {
    code: typeof err.code === 'string' ? err.code.toLowerCase() : '',
    message: typeof err.message === 'string' ? err.message.toLowerCase() : '',
    status: typeof err.status === 'number' ? err.status : undefined,
  };
}

export function isRateLimitError(error: unknown): boolean {
  const { code, message, status } = extractErrorDetails(error);
  return (
    status === 429 ||
    code.includes('rate_limit') ||
    code.includes('over_request_rate_limit') ||
    code.includes('over_email_send_rate_limit') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  );
}

/**
 * Maps Supabase Auth / network errors to safe, non-enumerating user messages.
 * Never leaks raw Supabase errors, stack traces, or whether an email exists.
 */
export function mapAuthError(error: unknown, action: AuthAction): string {
  if (isRateLimitError(error)) {
    return RATE_LIMIT_MESSAGE;
  }

  const { code, message } = extractErrorDetails(error);

  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Unable to reach the authentication service. Check your connection and try again.';
  }

  switch (action) {
    case 'login': {
      if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
        return 'Please check your email and verify your account before logging in.';
      }
      return 'Wrong email or password';
    }

    case 'signup': {
      if (code === 'weak_password' || message.includes('password should be at least')) {
        return 'Password must be at least 8 characters long.';
      }
      return 'Unable to complete sign up right now. Please check your details or try logging in.';
    }

    case 'reset': {
      return 'Unable to send reset link right now. Please try again in a moment.';
    }

    case 'oauth_google': {
      if (
        code === 'validation_failed' ||
        message.includes('provider is not enabled') ||
        message.includes('unsupported provider')
      ) {
        return "Google sign-in isn't enabled in Supabase yet.";
      }
      return 'Could not start Google sign-in. Please try again.';
    }

    case 'oauth_apple': {
      return "Apple sign-in isn't set up yet.";
    }

    case 'logout': {
      return 'Could not end your session cleanly. Please try again.';
    }

    case 'phone_otp': {
      if (
        code === 'phone_provider_disabled' ||
        message.includes('phone') && message.includes('disabled') ||
        message.includes('unsupported phone provider') ||
        message.includes('sms provider')
      ) {
        return 'Phone OTP login is not enabled in Supabase Auth yet.';
      }
      if (code === 'invalid_phone' || message.includes('invalid phone')) {
        return 'Please enter a valid mobile number with country code.';
      }
      return 'Unable to send OTP right now. Please verify your number and try again.';
    }

    case 'verify_otp': {
      if (
        code === 'otp_expired' ||
        message.includes('expired') ||
        message.includes('token has expired')
      ) {
        return 'That OTP code has expired. Please request a new one.';
      }
      return 'Invalid 6-digit OTP code. Please check and try again.';
    }
  }
}
