import { SellerHomeView } from '@/components/marketplace/SellerHomeView';
import { fetchMarketplaceCatalog, requireRole } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function SellerHomePage() {
  const { supabase, user } = await requireRole('seller');
  const { auctions, savedIds } = await fetchMarketplaceCatalog(supabase, user.id);

  return (
    <SellerHomeView
      user={user}
      initialAuctions={auctions}
      initialSavedIds={savedIds}
    />
  );
}
