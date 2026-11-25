import { SearchMarketplaceClient } from '@/components/marketplace/SearchMarketplaceClient';
import { fetchMarketplaceCatalog, requireAuthenticatedUser } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const { supabase, user } = await requireAuthenticatedUser();
  const { auctions, savedIds } = await fetchMarketplaceCatalog(supabase, user.id);

  return (
    <SearchMarketplaceClient
      user={user}
      initialAuctions={auctions}
      initialSavedIds={savedIds}
      initialQuery={params.q ?? ''}
      initialCategory={params.category ?? 'All'}
    />
  );
}
