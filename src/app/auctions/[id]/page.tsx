import { notFound } from 'next/navigation';
import { AuctionDetailClient } from '@/components/marketplace/AuctionDetailClient';
import { fetchAuctionDetail, requireAuthenticatedUser } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

interface AuctionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireAuthenticatedUser();
  const { auction, bids, isSaved, myProxyMax } = await fetchAuctionDetail(
    supabase,
    id,
    user.id
  );

  if (!auction) {
    notFound();
  }

  return (
    <AuctionDetailClient
      user={user}
      initialAuction={auction}
      initialBids={bids}
      initialSaved={isSaved}
      initialMyProxyMax={myProxyMax}
    />
  );
}
