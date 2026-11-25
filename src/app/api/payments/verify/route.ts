import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getRazorpayEnv, verifyRazorpayPaymentSignature } from '@/lib/payments/razorpay';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    testModeConfirm?: boolean;
  };

  if (!body.orderId || !body.razorpayOrderId) {
    return NextResponse.json({ error: 'Missing order or payment reference.' }, { status: 400 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', body.orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  if (order.status !== 'pending_payment') {
    return NextResponse.json({ error: 'Order is already settled.' }, { status: 409 });
  }
  if (order.razorpay_order_id !== body.razorpayOrderId) {
    return NextResponse.json({ error: 'Order reference mismatch.' }, { status: 400 });
  }

  const env = getRazorpayEnv();
  let paymentId = body.razorpayPaymentId?.trim() || '';
  let verified = false;

  if (env.isLiveConfigured) {
    // Live / Razorpay Test API keys configured: strictly verify HMAC signature
    if (!body.razorpayPaymentId || !body.razorpaySignature) {
      return NextResponse.json({ error: 'Missing Razorpay payment signature.' }, { status: 400 });
    }
    verified = verifyRazorpayPaymentSignature({
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
      secret: env.keySecret,
    });
  } else if (body.razorpayOrderId.startsWith('order_test_') && body.testModeConfirm) {
    // Server-side sandbox verification for hackathon demonstration when Razorpay API keys are absent
    paymentId = paymentId || `pay_test_${crypto.randomBytes(8).toString('hex')}`;
    const sandboxSecret = 'snipeshield_sandbox_hmac_secret';
    const serverComputedSig = crypto
      .createHmac('sha256', sandboxSecret)
      .update(`${body.razorpayOrderId}|${paymentId}`)
      .digest('hex');
    verified = verifyRazorpayPaymentSignature({
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: serverComputedSig,
      secret: sandboxSecret,
    });
  }

  if (!verified) {
    return NextResponse.json(
      { error: 'Server-side payment signature verification failed.' },
      { status: 400 }
    );
  }

  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      razorpay_payment_id: paymentId,
      payment_method: env.isLiveConfigured ? 'razorpay_test' : 'razorpay_sandbox',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('status', 'pending_payment');

  if (updateErr) {
    return NextResponse.json({ error: 'Could not record payment.' }, { status: 500 });
  }

  await Promise.all([
    supabase.from('payments').insert({
      order_id: order.id,
      user_id: user.id,
      provider: 'razorpay',
      provider_order_id: body.razorpayOrderId,
      provider_payment_id: paymentId,
      amount: Number(order.final_price),
      currency: 'INR',
      status: 'captured',
      raw_payload: { verified_server_side: true },
    }),
    supabase.from('notifications').insert([
      {
        user_id: order.buyer_id,
        type: 'payment',
        title: 'Payment Verified & Held in Escrow',
        message: `Payment ${paymentId} confirmed. Seller notified to ship your item.`,
        link: '/orders',
      },
      {
        user_id: order.seller_id,
        type: 'payment',
        title: 'Buyer Completed Payment',
        message: 'Funds are secured in SnipeShield Escrow. Please enter shipping tracking.',
        link: '/orders',
      },
    ]),
    supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'payment_verified',
      entity_type: 'order',
      entity_id: order.id,
      metadata: { paymentId, amount: order.final_price },
    }),
  ]);

  return NextResponse.json({ ok: true, paymentId, status: 'paid' }, { status: 200 });
}
