import { ProfileClient } from '@/components/marketplace/ProfileClient';
import { requireAuthenticatedUser } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { supabase, user } = await requireAuthenticatedUser();

  const [{ count: savedCount }, { count: activityCount }] = await Promise.all([
    supabase
      .from('saved_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    user.role === 'seller'
      ? supabase
          .from('auctions')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id)
      : supabase
          .from('bids')
          .select('id', { count: 'exact', head: true })
          .eq('bidder_id', user.id),
  ]);

  return (
    <ProfileClient
      user={user}
      stats={{
        savedCount: savedCount ?? 0,
        activityCount: activityCount ?? 0,
      }}
    />
  );
}
