import { ProfileClient } from '@/components/marketplace/ProfileClient';
import {
  fetchBuyerAnalytics,
  requireAuthenticatedUser,
} from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { supabase, user } = await requireAuthenticatedUser();

  const [
    { count: savedCount },
    { count: activityCount },
    analytics,
    { data: verifRow },
    { data: prefRow },
  ] = await Promise.all([
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
    fetchBuyerAnalytics(supabase, user.id),
    user.role === 'seller'
      ? supabase
          .from('seller_verifications')
          .select('business_name, government_id_type, document_reference, status, review_notes')
          .eq('seller_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('user_preferences')
      .select('personalization_enabled')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return (
    <ProfileClient
      user={user}
      stats={{
        savedCount: savedCount ?? 0,
        activityCount: activityCount ?? 0,
      }}
      analytics={analytics}
      verification={verifRow}
      personalizationEnabled={prefRow?.personalization_enabled ?? true}
    />
  );
}
