import { NotificationsClient } from '@/components/marketplace/NotificationsClient';
import { fetchUserNotifications, requireAuthenticatedUser } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const [notifications, { data: prefRow }] = await Promise.all([
    fetchUserNotifications(supabase, user.id),
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return (
    <NotificationsClient
      user={user}
      initialNotifications={notifications}
      initialPrefs={
        prefRow ?? {
          in_app_bids: true,
          in_app_outbid: true,
          in_app_ending_soon: true,
          email_enabled: false,
        }
      }
    />
  );
}
