import { AdminDashboardClient } from '@/components/marketplace/AdminDashboardClient';
import { fetchAdminDashboardData, requireAdmin } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { supabase, user } = await requireAdmin();
  const data = await fetchAdminDashboardData(supabase);

  return <AdminDashboardClient user={user} data={data} />;
}
