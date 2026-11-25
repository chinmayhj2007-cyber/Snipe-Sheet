import { NextResponse, type NextRequest } from 'next/server';
import { createRazorpayOrder } from '@/lib/payments/razorpay';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { orderId?: string };
  if (!body.orderId) return NextResponse.json({ error: 'Order ID required.' }, { status: 400 });

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', body.orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Only the winning buyer can initiate payment.' }, { status: 403 });
  }
  if (order.status !== 'pending_payment') {
    return NextResponse.json(
      { error: `Order is already in "${order.status}" state (duplicate payment blocked).` },
      { status: 409 }
    );
  }

  const rzpOrder = await createRazorpayOrder({
    amountInr: Number(order.final_price),
    receipt: `ss_${order.id.slice(0, 20)}`,
    notes: { auction_id: order.auction_id, order_id: order.id },
  });

  await Promise.all([
    supabase
      .from('orders')
      .update({
        razorpay_order_id: rzpOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id),
    supabase.from('payments').insert({
      order_id: order.id,
      user_id: user.id,
      provider: 'razorpay',
      provider_order_id: rzpOrder.id,
      amount: Number(order.final_price),
      currency: rzpOrder.currency,
      status: 'created',
      raw_payload: { mode: rzpOrder.mode },
    }),
  ]);

  return NextResponse.json(
    {
      razorpayOrderId: rzpOrder.id,
      amountPaise: rzpOrder.amountPaise,
      currency: rzpOrder.currency,
      keyId: rzpOrder.keyId,
      mode: rzpOrder.mode,
    },
    { status: 200 }
  );
}
