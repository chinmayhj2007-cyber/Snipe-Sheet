import { CompareClient } from '@/components/marketplace/CompareClient';
import { fetchMarketplaceCatalog, requireAuthenticatedUser } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const { auctions } = await fetchMarketplaceCatalog(supabase, user.id);

  return <CompareClient user={user} allAuctions={auctions} />;
}
