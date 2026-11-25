import { SavedItemsClient } from '@/components/marketplace/SavedItemsClient';
import { fetchSavedAuctions, requireRole } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function BidderSavedPage() {
  const { supabase, user } = await requireRole('bidder');
  const savedAuctions = await fetchSavedAuctions(supabase, user.id);

  return <SavedItemsClient user={user} initialSavedAuctions={savedAuctions} />;
}
