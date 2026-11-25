import { OrdersClient } from '@/components/marketplace/OrdersClient';
import { fetchUserOrders, requireAuthenticatedUser } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const { orders, disputes } = await fetchUserOrders(supabase, user.id);

  return (
    <OrdersClient
      user={user}
      initialOrders={orders}
      initialDisputes={disputes}
    />
  );
}
