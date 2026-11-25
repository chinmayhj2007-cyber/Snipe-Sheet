import { CreateListingForm } from '@/components/marketplace/CreateListingForm';
import { requireRole } from '@/lib/marketplace/server';

export const dynamic = 'force-dynamic';

export default async function SellerCreateListingPage() {
  const { user } = await requireRole('seller');
  return <CreateListingForm user={user} />;
}
