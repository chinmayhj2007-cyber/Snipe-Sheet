import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await context.params;
  if (!UUID_REGEX.test(auctionId)) {
    return NextResponse.json({ error: 'Invalid auction ID.' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { amount?: unknown; maxProxy?: unknown };
  try {
    body = (await request.json()) as { amount?: unknown; maxProxy?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid bid payload.' }, { status: 400 });
  }

  const amount = Number(body.amount);
  const maxProxy =
    body.maxProxy === undefined || body.maxProxy === null || body.maxProxy === ''
      ? null
      : Number(body.maxProxy);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Please enter a valid bid amount.' }, { status: 400 });
  }

  if (maxProxy !== null && (!Number.isFinite(maxProxy) || maxProxy < amount)) {
    return NextResponse.json(
      { error: 'Auto-proxy max bid ceiling must be at least your bid amount.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_amount: Number(amount.toFixed(2)),
    p_max_proxy: maxProxy !== null ? Number(maxProxy.toFixed(2)) : null,
  });

  if (error) {
    const safeMsg =
      error.message.includes('Only Bidder') ||
      error.message.includes('Sellers cannot bid') ||
      error.message.includes('Bid must be at least') ||
      error.message.includes('already ended') ||
      error.message.includes('not started') ||
      error.message.includes('not active') ||
      error.message.includes('Auto-proxy')
        ? error.message
        : 'Unable to place bid right now. Please try again.';
    return NextResponse.json({ error: safeMsg }, { status: 400 });
  }

  return NextResponse.json(data, { status: 200 });
}
