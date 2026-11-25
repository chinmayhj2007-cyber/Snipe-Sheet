import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: auction } = await supabase
    .from('auctions')
    .select('id, seller_id, bid_count, status, title, description, paused, edit_history')
    .eq('id', id)
    .maybeSingle();

  if (!auction) return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
  if (auction.seller_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: 'pause' | 'resume' | 'cancel' | 'edit';
    title?: string;
    description?: string;
    shippingDetails?: string;
    deliveryInfo?: string;
    returnPolicy?: string;
  };

  const history = Array.isArray(auction.edit_history) ? [...auction.edit_history] : [];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.action === 'pause') {
    updates.paused = true;
    history.push({ at: new Date().toISOString(), action: 'paused_by_seller' });
  } else if (body.action === 'resume') {
    updates.paused = false;
    history.push({ at: new Date().toISOString(), action: 'resumed_by_seller' });
  } else if (body.action === 'cancel') {
    if (auction.bid_count > 0) {
      return NextResponse.json(
        { error: 'Auctions with existing bids cannot be cancelled directly.' },
        { status: 400 }
      );
    }
    updates.status = 'cancelled';
    history.push({ at: new Date().toISOString(), action: 'cancelled_by_seller' });
  } else {
    if (typeof body.title === 'string' && body.title.trim().length >= 4) {
      updates.title = body.title.trim().slice(0, 120);
    }
    if (typeof body.description === 'string' && body.description.trim().length >= 15) {
      updates.description = body.description.trim().slice(0, 3000);
    }
    if (typeof body.shippingDetails === 'string') {
      updates.shipping_details = body.shippingDetails.trim().slice(0, 500);
    }
    if (typeof body.deliveryInfo === 'string') {
      updates.delivery_info = body.deliveryInfo.trim().slice(0, 500);
    }
    if (typeof body.returnPolicy === 'string') {
      updates.return_policy = body.returnPolicy.trim().slice(0, 500);
    }
    history.push({ at: new Date().toISOString(), action: 'edited_details' });
  }

  updates.edit_history = history;

  const { error } = await supabase.from('auctions').update(updates).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: `auction_${body.action ?? 'edit'}`,
    entity_type: 'auction',
    entity_id: id,
    metadata: updates,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: auction } = await supabase
    .from('auctions')
    .select('id, seller_id, status, bid_count')
    .eq('id', id)
    .maybeSingle();

  if (!auction) return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
  if (auction.seller_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  if (auction.bid_count > 0) {
    return NextResponse.json(
      { error: 'Cannot delete an auction that already has bids.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('auctions')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
