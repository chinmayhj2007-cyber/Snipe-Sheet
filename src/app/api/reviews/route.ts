import { NextResponse, type NextRequest } from 'next/server';
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
    rating?: number;
    comment?: string;
  };

  if (!body.orderId || typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: 'Order ID and 1-5 rating are required.' }, { status: 400 });
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
  if (!['paid', 'shipped', 'delivered'].includes(order.status)) {
    return NextResponse.json(
      { error: 'Reviews can only be submitted after payment is confirmed.' },
      { status: 400 }
    );
  }

  const reviewedUserId = order.buyer_id === user.id ? order.seller_id : order.buyer_id;

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      order_id: order.id,
      reviewer_id: user.id,
      reviewed_user_id: reviewedUserId,
      rating: Math.round(body.rating),
      comment: (body.comment ?? '').trim().slice(0, 600),
      is_demo: false,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ review }, { status: 201 });
}
