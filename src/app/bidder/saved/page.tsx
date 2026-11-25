import { SavedItemsClient } from '@/components/marketplace/SavedItemsClient';
import { fetchMarketplaceCatalog, requireRole } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function BidderSavedPage() {
  const { supabase, user } = await requireRole('bidder');
  const { auctions, savedIds } = await fetchMarketplaceCatalog(supabase, user.id);
  const savedSet = new Set(savedIds);
  const savedAuctions = auctions.filter((item) => savedSet.has(item.id));

  return <SavedItemsClient user={user} initialSavedAuctions={savedAuctions} />;
}
