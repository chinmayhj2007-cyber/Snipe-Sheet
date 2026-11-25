import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const body = rawBody as { auctionId?: unknown };
  const auctionId = typeof body.auctionId === 'string' ? body.auctionId.trim() : '';
  if (!UUID_REGEX.test(auctionId)) {
    return NextResponse.json({ error: 'Invalid auction identifier.' }, { status: 400 });
  }

  const { data: existing, error: selectError } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('auction_id', auctionId)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json({ error: 'Unable to check saved items.' }, { status: 500 });
  }

  if (existing) {
    const { error: delError } = await supabase
      .from('saved_items')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', user.id);

    if (delError) {
      return NextResponse.json({ error: 'Failed to remove saved item.' }, { status: 500 });
    }
    return NextResponse.json({ saved: false }, { status: 200 });
  }

  const { error: insError } = await supabase.from('saved_items').insert({
    user_id: user.id,
    auction_id: auctionId,
  });

  if (insError) {
    if (insError.code === '23505') {
      return NextResponse.json({ saved: true }, { status: 200 });
    }
    if (insError.code === '23503') {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to save auction item.' }, { status: 500 });
  }

  return NextResponse.json({ saved: true }, { status: 200 });
}
