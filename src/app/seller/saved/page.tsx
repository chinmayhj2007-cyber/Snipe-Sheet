import { SavedItemsClient } from '@/components/marketplace/SavedItemsClient';
import { fetchSavedAuctions, requireRole } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function SellerSavedPage() {
  const { supabase, user } = await requireRole('seller');
  const savedAuctions = await fetchSavedAuctions(supabase, user.id);

  return <SavedItemsClient user={user} initialSavedAuctions={savedAuctions} />;
}
