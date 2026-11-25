import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data } = await supabase
    .from('disputes')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json({ disputes: data ?? [] }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    reason?: string;
    description?: string;
  };

  if (!body.orderId || !body.reason || body.reason.trim().length < 3) {
    return NextResponse.json({ error: 'Order ID and dispute reason are required.' }, { status: 400 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', body.orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.buyer_id !== user.id && order.seller_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      order_id: order.id,
      filed_by: user.id,
      reason: body.reason.trim().slice(0, 120),
      description: (body.description ?? '').trim().slice(0, 1500),
      status: 'open',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await Promise.all([
    supabase
      .from('orders')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', order.id),
    supabase.from('notifications').insert({
      user_id: order.buyer_id === user.id ? order.seller_id : order.buyer_id,
      type: 'dispute',
      title: 'Order Dispute Opened',
      message: `A dispute (${body.reason.trim()}) was opened on your order.`,
      link: '/orders',
    }),
    supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'dispute_filed',
      entity_type: 'dispute',
      entity_id: dispute.id,
      metadata: { orderId: order.id, reason: body.reason },
    }),
  ]);

  return NextResponse.json({ dispute }, { status: 201 });
}
