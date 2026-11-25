import { NextResponse, type NextRequest } from 'next/server';
import { getRazorpayEnv, verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const { webhookSecret } = getRazorpayEnv();

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Razorpay webhook secret not configured.' },
      { status: 503 }
    );
  }

  const valid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
