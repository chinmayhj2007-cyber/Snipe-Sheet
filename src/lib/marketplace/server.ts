import { redirect } from 'next/navigation';
import { normalizeRole, type UserRole } from '@/lib/auth/validation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { AuctionItem, BidEntry, MarketplaceUser } from './types';

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

function deriveDisplayName(fullName?: string | null, email?: string | null, phone?: string | null): string {
  const clean = (fullName ?? '').trim();
  if (clean) return clean;
  if (email && email.includes('@')) {
    return email.split('@')[0] || email;
  }
  if (phone) return phone;
  return 'Snipe Shield User';
}

export async function requireAuthenticatedUser(): Promise<{
  supabase: ServerSupabase;
  user: MarketplaceUser;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect('/login?notice=demo');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const role = normalizeRole(profile?.role ?? user.user_metadata?.role);
  const email = profile?.email || user.email || '';
  const phone = user.phone || '';
  const fullName = profile?.full_name || '';

  return {
    supabase,
    user: {
      id: user.id,
      email,
      phone,
      fullName,
      displayName: deriveDisplayName(fullName, email, phone),
      role,
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

export async function requireRole(expectedRole: UserRole): Promise<{
  supabase: ServerSupabase;
  user: MarketplaceUser;
}> {
  const ctx = await requireAuthenticatedUser();
  if (ctx.user.role !== expectedRole) {
    redirect(ctx.user.role === 'seller' ? '/seller/home' : '/bidder/home');
  }
  return ctx;
}

async function fetchPublicDisplayMap(
  supabase: ServerSupabase,
  ids: string[]
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase.rpc('get_public_profiles', {
    p_ids: uniqueIds,
  });

  if (Array.isArray(data)) {
    for (const row of data as Array<{ id: string; display_name: string }>) {
      map.set(row.id, row.display_name || 'User');
    }
  }
  return map;
}

export async function fetchMarketplaceCatalog(
  supabase: ServerSupabase,
  userId: string
): Promise<{
  auctions: AuctionItem[];
  savedIds: string[];
}> {
  const [{ data: rawAuctions }, { data: rawSaved }, { data: rawBids }] = await Promise.all([
    supabase
      .from('auctions')
      .select(
        'id, seller_id, title, description, category, condition, image_url, image_urls, starting_price, current_price, min_increment, highest_bidder_id, status, starts_at, ends_at, extensions_count, created_at'
      )
      .in('status', ['active', 'ended'])
      .order('created_at', { ascending: false })
      .limit(80),
    supabase.from('saved_items').select('auction_id').eq('user_id', userId),
    supabase.from('bids').select('auction_id'),
  ]);

  const bidCounts = new Map<string, number>();
  if (Array.isArray(rawBids)) {
    for (const row of rawBids) {
      bidCounts.set(row.auction_id, (bidCounts.get(row.auction_id) ?? 0) + 1);
    }
  }

  const profileIds: string[] = [];
  for (const row of rawAuctions ?? []) {
    if (row.seller_id) profileIds.push(row.seller_id);
    if (row.highest_bidder_id) profileIds.push(row.highest_bidder_id);
  }
  const nameMap = await fetchPublicDisplayMap(supabase, profileIds);

  const auctions: AuctionItem[] = (rawAuctions ?? []).map((row) => ({
    id: row.id,
    seller_id: row.seller_id,
    seller_name: nameMap.get(row.seller_id) ?? 'Verified Seller',
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? 'Electronics',
    condition: row.condition ?? 'New',
    image_url: row.image_url ?? null,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
    starting_price: Number(row.starting_price),
    current_price: Number(row.current_price),
    min_increment: Number(row.min_increment ?? 100),
    reserve_price: null,
    highest_bidder_id: row.highest_bidder_id ?? null,
    highest_bidder_name: row.highest_bidder_id
      ? nameMap.get(row.highest_bidder_id) ?? 'Bidder'
      : null,
    status: row.status,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    extensions_count: Number(row.extensions_count ?? 0),
    created_at: row.created_at,
    bid_count: bidCounts.get(row.id) ?? 0,
  }));

  const savedIds = (rawSaved ?? []).map((s) => s.auction_id);

  return { auctions, savedIds };
}

export async function fetchAuctionDetail(
  supabase: ServerSupabase,
  auctionId: string,
  userId: string
): Promise<{
  auction: AuctionItem | null;
  bids: BidEntry[];
  isSaved: boolean;
  myProxyMax: number | null;
}> {
  const { data: row } = await supabase
    .from('auctions')
    .select(
      'id, seller_id, title, description, category, condition, image_url, image_urls, starting_price, current_price, min_increment, reserve_price, highest_bidder_id, status, starts_at, ends_at, extensions_count, created_at'
    )
    .eq('id', auctionId)
    .maybeSingle();

  if (!row) {
    return { auction: null, bids: [], isSaved: false, myProxyMax: null };
  }

  const [{ data: rawBids }, { data: savedRow }, { data: proxyRow }] = await Promise.all([
    supabase
      .from('bids')
      .select('id, auction_id, bidder_id, amount, is_auto_proxy, created_at')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('auction_id', auctionId)
      .maybeSingle(),
    supabase
      .from('proxy_bids')
      .select('max_amount')
      .eq('auction_id', auctionId)
      .eq('bidder_id', userId)
      .maybeSingle(),
  ]);

  const ids: string[] = [row.seller_id];
  if (row.highest_bidder_id) ids.push(row.highest_bidder_id);
  for (const b of rawBids ?? []) {
    if (b.bidder_id) ids.push(b.bidder_id);
  }
  const nameMap = await fetchPublicDisplayMap(supabase, ids);

  // Never expose reserve_price to non-sellers
  const safeReservePrice =
    row.seller_id === userId && row.reserve_price !== null ? Number(row.reserve_price) : null;

  const auction: AuctionItem = {
    id: row.id,
    seller_id: row.seller_id,
    seller_name: nameMap.get(row.seller_id) ?? 'Verified Seller',
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? 'Electronics',
    condition: row.condition ?? 'New',
    image_url: row.image_url ?? null,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
    starting_price: Number(row.starting_price),
    current_price: Number(row.current_price),
    min_increment: Number(row.min_increment ?? 100),
    reserve_price: safeReservePrice,
    highest_bidder_id: row.highest_bidder_id ?? null,
    highest_bidder_name: row.highest_bidder_id
      ? nameMap.get(row.highest_bidder_id) ?? 'Bidder'
      : null,
    status: row.status,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    extensions_count: Number(row.extensions_count ?? 0),
    created_at: row.created_at,
    bid_count: (rawBids ?? []).length,
  };

  const bids: BidEntry[] = (rawBids ?? []).map((b) => ({
    id: b.id,
    auction_id: b.auction_id,
    bidder_id: b.bidder_id,
    bidder_name:
      b.bidder_id === userId ? 'You' : nameMap.get(b.bidder_id) ?? 'Bidder',
    amount: Number(b.amount),
    is_auto_proxy: Boolean(b.is_auto_proxy),
    created_at: b.created_at,
  }));

  return {
    auction,
    bids,
    isSaved: Boolean(savedRow),
    myProxyMax: proxyRow?.max_amount ? Number(proxyRow.max_amount) : null,
  };
}
