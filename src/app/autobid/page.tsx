import { AutoBidDashboardClient } from '@/components/marketplace/AutoBidDashboardClient';
import { requireRole } from '@/lib/marketplace/server';
import type { AutoBidConfig } from '@/lib/marketplace/types';

export const dynamic = 'force-dynamic';

export default async function AutoBidPage() {
  const { supabase, user } = await requireRole('bidder');

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
      .limit(40),
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

  const enriched: AutoBidConfig[] = (configs ?? []).map((c) => {
    const a = auctionMap.get(c.auction_id);
    return {
      id: c.id,
      auction_id: c.auction_id,
      bidder_id: c.bidder_id,
      max_amount: Number(c.max_amount),
      increment_strategy: c.increment_strategy,
      stop_condition: c.stop_condition,
      is_active: Boolean(c.is_active),
      bids_placed: Number(c.bids_placed ?? 0),
      last_bid_at: c.last_bid_at ?? null,
      created_at: c.created_at,
      auction_title: a?.title ?? 'Auction',
      auction_current_price: a ? Number(a.current_price) : 0,
      auction_ends_at: a?.ends_at ?? undefined,
      auction_status: a?.status ?? 'active',
      auction_highest_bidder_id: a?.highest_bidder_id ?? null,
    };
  });

  return (
    <AutoBidDashboardClient
      user={user}
      initialConfigs={enriched}
      initialLogs={logs ?? []}
    />
  );
}
