import { NextResponse, type NextRequest } from 'next/server';
import { AUCTION_CATEGORIES, AUCTION_CONDITIONS } from '@/lib/marketplace/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const VALID_CATEGORIES = new Set<string>(AUCTION_CATEGORIES.map((c) => c.id));
const VALID_CONDITIONS = new Set<string>(AUCTION_CONDITIONS);

export async function POST(request: NextRequest) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'seller') {
    return NextResponse.json(
      { error: 'Forbidden: Only Seller accounts can publish auctions.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const condition = typeof body.condition === 'string' ? body.condition.trim() : '';
  const startingPrice = Number(body.startingPrice);
  const minIncrement = Number(body.minIncrement);
  const reserveRaw = body.reservePrice;
  const reservePrice =
    reserveRaw === null || reserveRaw === undefined || reserveRaw === ''
      ? null
      : Number(reserveRaw);
  const startsAtRaw = typeof body.startsAt === 'string' ? body.startsAt : '';
  const endsAtRaw = typeof body.endsAt === 'string' ? body.endsAt : '';
  const rawImages = Array.isArray(body.imageUrls) ? body.imageUrls : [];

  if (title.length < 4 || title.length > 120) {
    return NextResponse.json(
      { error: 'Item title must be between 4 and 120 characters.' },
      { status: 400 }
    );
  }

  if (description.length < 15 || description.length > 3000) {
    return NextResponse.json(
      { error: 'Description must be between 15 and 3000 characters.' },
      { status: 400 }
    );
  }

  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Please choose a valid category.' }, { status: 400 });
  }

  if (!VALID_CONDITIONS.has(condition)) {
    return NextResponse.json({ error: 'Please choose a valid item condition.' }, { status: 400 });
  }

  if (!Number.isFinite(startingPrice) || startingPrice < 1 || startingPrice > 100000000) {
    return NextResponse.json(
      { error: 'Starting bid must be a valid amount greater than ₹1.' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(minIncrement) || minIncrement < 1 || minIncrement > 10000000) {
    return NextResponse.json(
      { error: 'Minimum bid increment must be at least ₹1.' },
      { status: 400 }
    );
  }

  if (reservePrice !== null && (!Number.isFinite(reservePrice) || reservePrice < startingPrice)) {
    return NextResponse.json(
      { error: 'Reserve price must be greater than or equal to starting price.' },
      { status: 400 }
    );
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: 'Invalid auction start or end date.' }, { status: 400 });
  }

  if (endsAt.getTime() <= startsAt.getTime() + 5 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Auction end time must be at least 5 minutes after start time.' },
      { status: 400 }
    );
  }

  if (endsAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'Auction end time must be in the future.' },
      { status: 400 }
    );
  }

  const supabaseUrlPrefix = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const imageUrls = rawImages
    .filter((u): u is string => typeof u === 'string' && u.startsWith('https://'))
    .filter((u) => !supabaseUrlPrefix || u.startsWith(supabaseUrlPrefix))
    .slice(0, 6);

  const { data: created, error: insertError } = await supabase
    .from('auctions')
    .insert({
      seller_id: user.id,
      title,
      description,
      category,
      condition,
      starting_price: Number(startingPrice.toFixed(2)),
      current_price: Number(startingPrice.toFixed(2)),
      min_increment: Number(minIncrement.toFixed(2)),
      reserve_price: reservePrice !== null ? Number(reservePrice.toFixed(2)) : null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      status: 'active',
    })
    .select('id')
    .single();

  if (insertError || !created) {
    return NextResponse.json(
      { error: 'Could not publish auction right now. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
