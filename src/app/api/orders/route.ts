import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  return NextResponse.json({ orders: orders ?? [] }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    action?: 'ship' | 'deliver' | 'save_address';
    trackingNumber?: string;
    shippingAddress?: Record<string, string>;
  };

  if (!body.orderId) {
    return NextResponse.json({ error: 'Order ID required.' }, { status: 400 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', body.orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  if (body.action === 'ship') {
    if (order.seller_id !== user.id) {
      return NextResponse.json({ error: 'Only the seller can mark an order shipped.' }, { status: 403 });
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Order must be paid before shipping.' }, { status: 400 });
    }
    const tracking = (body.trackingNumber ?? '').trim();
    if (tracking.length < 4) {
      return NextResponse.json({ error: 'Valid courier tracking number required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: tracking.slice(0, 80),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'order',
      title: 'Order Shipped',
      message: `Seller dispatched your item. Tracking ID: ${tracking}`,
      link: '/orders',
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (body.action === 'deliver') {
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can confirm delivery.' }, { status: 403 });
    }
    if (order.status !== 'shipped') {
      return NextResponse.json({ error: 'Order must be shipped first.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from('notifications').insert({
      user_id: order.seller_id,
      type: 'order',
      title: 'Delivery Confirmed',
      message: 'Buyer confirmed item delivery. Escrow release complete.',
      link: '/orders',
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (body.action === 'save_address' && body.shippingAddress) {
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    await supabase
      .from('orders')
      .update({
        shipping_address: body.shippingAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid order action.' }, { status: 400 });
}
