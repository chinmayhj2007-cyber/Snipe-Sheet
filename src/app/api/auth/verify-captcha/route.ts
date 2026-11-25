import { NextResponse, type NextRequest } from 'next/server';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

function mapTurnstileError(errorCodes?: string[]): string {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Security verification failed. Please complete the CAPTCHA again.';
  }
  if (errorCodes.includes('timeout-or-duplicate')) {
    return 'Security check expired or was already used. Please complete it again.';
  }
  if (errorCodes.includes('missing-input-response') || errorCodes.includes('invalid-input-response')) {
    return 'Invalid CAPTCHA response. Please complete the security check again.';
  }
  if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-input-secret')) {
    return 'CAPTCHA server configuration is invalid. Please contact support.';
  }
  return 'Security verification failed. Please try again.';
}

export async function POST(request: NextRequest) {
  const secretKey = (process.env.TURNSTILE_SECRET_KEY ?? '').trim();
  if (!secretKey || secretKey.toLowerCase().includes('placeholder')) {
    return NextResponse.json(
      {
        verified: false,
        error:
          'CAPTCHA verification is not configured on the server. Add TURNSTILE_SECRET_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: { token?: unknown };
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return NextResponse.json(
      { verified: false, error: 'Invalid verification payload.' },
      { status: 400 }
    );
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length > 4096) {
    return NextResponse.json(
      { verified: false, error: 'Please complete the CAPTCHA security check.' },
      { status: 400 }
    );
  }

  const formData = new URLSearchParams();
  formData.set('secret', secretKey);
  formData.set('response', token);

  const clientIp =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();

  if (clientIp) {
    formData.set('remoteip', clientIp);
  }

  try {
    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      cache: 'no-store',
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Unable to reach CAPTCHA verification service. Please try again.',
        },
        { status: 502 }
      );
    }

    const result = (await verifyRes.json()) as TurnstileVerifyResponse;
    if (!result.success) {
      return NextResponse.json(
        {
          verified: false,
          error: mapTurnstileError(result['error-codes']),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ verified: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        verified: false,
        error: 'CAPTCHA verification timed out. Please try again.',
      },
      { status: 502 }
    );
  }
}
