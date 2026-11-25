'use client';

export async function verifyCaptchaTokenOnServer(
  token: string | null
): Promise<{ verified: true } | { verified: false; error: string }> {
  if (!token) {
    return {
      verified: false,
      error: 'Please complete the CAPTCHA security check before continuing.',
    };
  }

  try {
    const res = await fetch('/api/auth/verify-captcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = (await res.json()) as { verified?: boolean; error?: string };
    if (!res.ok || !data.verified) {
      return {
        verified: false,
        error:
          data.error ??
          'Security verification failed. Please complete the CAPTCHA again.',
      };
    }

    return { verified: true };
  } catch {
    return {
      verified: false,
      error: 'Unable to verify CAPTCHA right now. Check your connection and try again.',
    };
  }
}
