import type { UserRole } from '@/lib/auth/validation';

export const AUCTION_CATEGORIES = [
  {
    id: 'Electronics',
    label: 'Electronics & Tech',
    subtitle: 'Flagship gadgets, wearables & smart gear',
  },
  {
    id: 'Laptops',
    label: 'Laptops & Workstations',
    subtitle: 'MacBooks, ultrabooks & creator rigs',
  },
  {
    id: 'Smartphones',
    label: 'Smartphones',
    subtitle: 'Unlocked flagships & limited editions',
  },
  {
    id: 'Audio',
    label: 'Audio & Studio',
    subtitle: 'Headphones, DACs & studio monitors',
  },
  {
    id: 'Gaming',
    label: 'Gaming & Consoles',
    subtitle: 'GPUs, handhelds & collector editions',
  },
  {
    id: 'Cameras',
    label: 'Cameras & Optics',
    subtitle: 'Mirrorless bodies, lenses & drones',
  },
] as const;

export const AUCTION_CONDITIONS = [
  'New',
  'Like New',
  'Mint',
  'Good',
  'Refurbished',
] as const;

export type AuctionCondition = (typeof AUCTION_CONDITIONS)[number];

export interface MarketplaceUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  displayName: string;
  role: UserRole;
  avatarUrl: string | null;
}

export interface AuctionItem {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  image_url: string | null;
  image_urls: string[];
  starting_price: number;
  current_price: number;
  min_increment: number;
  reserve_price: number | null;
  highest_bidder_id: string | null;
  highest_bidder_name: string | null;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  starts_at: string;
  ends_at: string;
  extensions_count: number;
  created_at: string;
  bid_count?: number;
}

export interface BidEntry {
  id: string;
  auction_id: string;
  bidder_id: string;
  bidder_name: string;
  amount: number;
  is_auto_proxy: boolean;
  created_at: string;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAuctionPhase(
  auction: Pick<AuctionItem, 'status' | 'starts_at' | 'ends_at'>,
  nowMs: number = Date.now()
): 'live' | 'upcoming' | 'ended' {
  if (auction.status === 'ended' || auction.status === 'cancelled') {
    return 'ended';
  }
  const startsMs = new Date(auction.starts_at).getTime();
  const endsMs = new Date(auction.ends_at).getTime();
  if (nowMs >= endsMs) return 'ended';
  if (nowMs < startsMs) return 'upcoming';
  return 'live';
}

export function getPrimaryImage(auction: Pick<AuctionItem, 'image_url' | 'image_urls'>): string | null {
  if (auction.image_urls && auction.image_urls.length > 0 && auction.image_urls[0]) {
    return auction.image_urls[0];
  }
  return auction.image_url ?? null;
}
