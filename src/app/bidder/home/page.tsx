import { BidderHomeView } from '@/components/marketplace/BidderHomeView';
import { fetchMarketplaceCatalog, requireRole } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function BidderHomePage() {
  const { supabase, user } = await requireRole('bidder');
  const {
    auctions,
    savedIds,
    recentlyViewedIds,
    preferredCategories,
    personalizationEnabled,
  } = await fetchMarketplaceCatalog(supabase, user.id);

  return (
    <BidderHomeView
      user={user}
      initialAuctions={auctions}
      initialSavedIds={savedIds}
      recentlyViewedIds={recentlyViewedIds}
      preferredCategories={preferredCategories}
      personalizationEnabled={personalizationEnabled}
    />
  );
}
