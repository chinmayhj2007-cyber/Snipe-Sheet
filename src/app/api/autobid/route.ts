import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const [{ data: configs }, { data: logs }] = await Promise.all([
    supabase
      .from('auto_bids')
      .select('*')
      .eq('bidder_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('auto_bid_logs')
      .select('*')
      .eq('bidder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const auctionIds = Array.from(new Set((configs ?? []).map((c) => c.auction_id)));
  const { data: auctions } =
    auctionIds.length > 0
      ? await supabase
          .from('auctions')
          .select('id, title, current_price, ends_at, status, highest_bidder_id')
          .in('id', auctionIds)
      : { data: [] };

  const auctionMap = new Map((auctions ?? []).map((a) => [a.id, a]));

  const enriched = (configs ?? []).map((c) => {
    const a = auctionMap.get(c.auction_id);
    return {
      ...c,
      max_amount: Number(c.max_amount),
      auction_title: a?.title ?? 'Auction',
      auction_current_price: a ? Number(a.current_price) : 0,
      auction_ends_at: a?.ends_at ?? null,
      auction_status: a?.status ?? 'active',
      auction_highest_bidder_id: a?.highest_bidder_id ?? null,
    };
  });

  return NextResponse.json({ autoBids: enriched, logs: logs ?? [] }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_suspended')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
  }
  if (profile?.role !== 'bidder') {
    return NextResponse.json({ error: 'Only Bidders can activate AutoBid AI.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    auctionId?: string;
    maxAmount?: number;
    incrementStrategy?: 'minimum' | 'step_2x' | 'conservative';
    stopCondition?: 'max_budget' | 'max_5_bids' | 'outbid_twice';
    confirmed?: boolean;
  };

  if (!body.confirmed) {
    return NextResponse.json(
      { error: 'Explicit confirmation is required before activating AutoBid AI.' },
      { status: 400 }
    );
  }

  if (!body.auctionId || typeof body.maxAmount !== 'number' || !Number.isFinite(body.maxAmount)) {
    return NextResponse.json({ error: 'Valid auction and maximum budget are required.' }, { status: 400 });
  }

  const { data: auction } = await supabase
    .from('auctions')
    .select('id, seller_id, title, starting_price, current_price, min_increment, highest_bidder_id, status, ends_at')
    .eq('id', body.auctionId)
    .maybeSingle();

  if (!auction) return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
  if (auction.seller_id === user.id) {
    return NextResponse.json({ error: 'Sellers cannot activate AutoBid on their own auctions.' }, { status: 400 });
  }
  if (auction.status !== 'active' || new Date(auction.ends_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Auction is no longer active.' }, { status: 400 });
  }

  const minRequired = auction.highest_bidder_id
    ? Number(auction.current_price) + Number(auction.min_increment)
    : Number(auction.starting_price);

  if (body.maxAmount < minRequired) {
    return NextResponse.json(
      { error: `Maximum AutoBid budget must be at least ₹${minRequired}.` },
      { status: 400 }
    );
  }

  const strategy = ['minimum', 'step_2x', 'conservative'].includes(body.incrementStrategy ?? '')
    ? body.incrementStrategy!
    : 'minimum';
  const stopCondition = ['max_budget', 'max_5_bids', 'outbid_twice'].includes(
    body.stopCondition ?? ''
  )
    ? body.stopCondition!
    : 'max_budget';

  const { data: config, error: upsertError } = await supabase
    .from('auto_bids')
    .upsert(
      {
        auction_id: body.auctionId,
        bidder_id: user.id,
        max_amount: Number(body.maxAmount.toFixed(2)),
        increment_strategy: strategy,
        stop_condition: stopCondition,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'auction_id,bidder_id' }
    )
    .select('*')
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  // Deterministic server-side rule: if bidder is not currently leading, submit initial valid bid with proxy ceiling
  let bidResult: Record<string, unknown> | null = null;
  if (auction.highest_bidder_id !== user.id) {
    const stepMultiplier = strategy === 'step_2x' ? 2 : 1;
    const desiredInitial =
      auction.highest_bidder_id === null
        ? Number(auction.starting_price)
        : Math.min(
            body.maxAmount,
            Number(auction.current_price) + Number(auction.min_increment) * stepMultiplier
          );

    const { data: rpcData } = await supabase.rpc('place_bid_v2', {
      p_auction_id: body.auctionId,
      p_amount: Number(desiredInitial.toFixed(2)),
      p_max_proxy: Number(body.maxAmount.toFixed(2)),
      p_idempotency_key: `autobid_init_${config.id}_${Date.now()}`,
    });
    bidResult = (rpcData as Record<string, unknown>) ?? null;
  } else {
    await supabase.rpc('place_bid_v2', {
      p_auction_id: body.auctionId,
      p_amount: Number(auction.current_price),
      p_max_proxy: Number(body.maxAmount.toFixed(2)),
      p_idempotency_key: null,
    });
  }

  await Promise.all([
    supabase.from('auto_bid_logs').insert({
      auto_bid_id: config.id,
      auction_id: body.auctionId,
      bidder_id: user.id,
      action: 'activated',
      bid_amount: Number(body.maxAmount.toFixed(2)),
      note: `AutoBid AI activated (strategy: ${strategy}, stop: ${stopCondition})`,
    }),
    supabase.from('notifications').insert({
      user_id: user.id,
      type: 'autobid',
      title: 'AutoBid AI Activated',
      message: `AutoBid enabled on "${auction.title}" with max ceiling ₹${body.maxAmount.toLocaleString('en-IN')}.`,
      link: `/auctions/${body.auctionId}`,
    }),
  ]);

  return NextResponse.json({ ok: true, config, bidResult }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    isActive?: boolean;
    maxAmount?: number;
  };

  if (!body.id) return NextResponse.json({ error: 'AutoBid ID required.' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.isActive === 'boolean') updates.is_active = body.isActive;
  if (typeof body.maxAmount === 'number' && Number.isFinite(body.maxAmount) && body.maxAmount > 0) {
    updates.max_amount = Number(body.maxAmount.toFixed(2));
  }

  const { data: updated, error } = await supabase
    .from('auto_bids')
    .update(updates)
    .eq('id', body.id)
    .eq('bidder_id', user.id)
    .select('*')
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'AutoBid record not found.' }, { status: 400 });
  }

  await supabase.from('auto_bid_logs').insert({
    auto_bid_id: updated.id,
    auction_id: updated.auction_id,
    bidder_id: user.id,
    action: body.isActive === false ? 'paused' : body.isActive === true ? 'resumed' : 'updated',
    bid_amount: Number(updated.max_amount),
    note: `AutoBid ${body.isActive === false ? 'paused' : body.isActive === true ? 'resumed' : 'limit updated'}`,
  });

  return NextResponse.json({ ok: true, config: updated }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'AutoBid ID required.' }, { status: 400 });

  const { error } = await supabase
    .from('auto_bids')
    .delete()
    .eq('id', id)
    .eq('bidder_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
