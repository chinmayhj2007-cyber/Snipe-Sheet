import { SavedItemsClient } from '@/components/marketplace/SavedItemsClient';
import { fetchMarketplaceCatalog, requireRole } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function SellerSavedPage() {
  const { supabase, user } = await requireRole('seller');
  const { auctions, savedIds } = await fetchMarketplaceCatalog(supabase, user.id);
  const savedSet = new Set(savedIds);
  const savedAuctions = auctions.filter((item) => savedSet.has(item.id));

  return <SavedItemsClient user={user} initialSavedAuctions={savedAuctions} />;
}
