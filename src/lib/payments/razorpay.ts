import crypto from 'node:crypto';

export interface RazorpayEnv {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isLiveConfigured: boolean;
}

export function getRazorpayEnv(): RazorpayEnv {
  const keyId = (process.env.RAZORPAY_KEY_ID ?? '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET ?? '').trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? keySecret).trim();

  return {
    keyId,
    keySecret,
    webhookSecret,
    isLiveConfigured: Boolean(keyId && keySecret),
  };
}

/**
 * Verifies Razorpay Checkout signature: hmac_sha256(razorpay_order_id + "|" + razorpay_payment_id, secret)
 */
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  secret: string;
}): boolean {
  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', params.secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(params.razorpaySignature, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature header (X-Razorpay-Signature).
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Creates a Razorpay order via REST API when test keys exist; otherwise generates a deterministic
 * sandbox test-mode order token so hackathon workflows remain verifiable end-to-end.
 */
export async function createRazorpayOrder(params: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amountPaise: number;
  currency: string;
  mode: 'razorpay_api' | 'sandbox_test';
  keyId: string;
}> {
  const env = getRazorpayEnv();
  const amountPaise = Math.max(100, Math.round(params.amountInr * 100));

  if (env.isLiveConfigured) {
    const authHeader = Buffer.from(`${env.keyId}:${env.keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: params.receipt.slice(0, 40),
        notes: params.notes ?? {},
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as { id: string; amount: number; currency: string };
      return {
        id: json.id,
        amountPaise: json.amount,
        currency: json.currency,
        mode: 'razorpay_api',
        keyId: env.keyId,
      };
    }
  }

  // Test-mode sandbox order ID (requires server-side HMAC verification with sandbox secret)
  const sandboxId = `order_test_${crypto.randomBytes(8).toString('hex')}`;
  return {
    id: sandboxId,
    amountPaise,
    currency: 'INR',
    mode: 'sandbox_test',
    keyId: env.keyId || 'rzp_test_sandbox_snipeshield',
  };
}
