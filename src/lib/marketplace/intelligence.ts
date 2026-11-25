import type {
  AuctionItem,
  PriceInsight,
  TrueCostBreakdown,
  TrustScoreBreakdown,
  VerificationStatus,
} from './types';

/**
 * Computes transparent TrueCost breakdown for bidders and order checkout.
 * - Platform fee: 2.5% (capped at ₹2,500)
 * - GST: 18% on platform fee only (not double-taxing private resale goods)
 * - Shipping: Seller-disclosed shipping_cost
 */
export function calculateTrueCost(
  bidAmount: number,
  shippingCost: number = 0,
  platformFeeRate: number = 0.025
): TrueCostBreakdown {
  const safeBid = Math.max(0, Number.isFinite(bidAmount) ? bidAmount : 0);
  const safeShipping = Math.max(0, Number.isFinite(shippingCost) ? shippingCost : 0);
  const platformFee = Math.min(2500, Math.round(safeBid * platformFeeRate));
  const taxAmount = Math.round(platformFee * 0.18);
  const totalPayable = Math.round(safeBid + platformFee + safeShipping + taxAmount);

  return {
    winningBid: safeBid,
    platformFee,
    shippingCost: safeShipping,
    taxAmount,
    totalPayable,
  };
}

/**
 * Estimates comparable price ranges for sellers/bidders using actual historical auctions.
 * Clearly marks when sample size is small instead of inventing fake precision.
 */
export function computePriceInsights(
  targetCategory: string,
  startingPrice: number,
  catalogAuctions: AuctionItem[]
): PriceInsight {
  const comparables = catalogAuctions
    .filter((a) => a.category === targetCategory && a.current_price > 0)
    .map((a) => a.current_price)
    .sort((a, b) => a - b);

  if (comparables.length >= 2) {
    const low = comparables[Math.floor(comparables.length * 0.2)] ?? comparables[0];
    const median = comparables[Math.floor(comparables.length * 0.5)] ?? comparables[0];
    const high =
      comparables[Math.min(comparables.length - 1, Math.floor(comparables.length * 0.85))] ??
      comparables[comparables.length - 1];

    return {
      lowEstimate: Math.round(low),
      medianEstimate: Math.round(median),
      highEstimate: Math.round(high),
      comparableCount: comparables.length,
      basisNote: `Estimated from ${comparables.length} comparable ${targetCategory} listings on SnipeShield.`,
    };
  }

  const base = Math.max(100, startingPrice || 5000);
  return {
    lowEstimate: Math.round(base * 1.05),
    medianEstimate: Math.round(base * 1.25),
    highEstimate: Math.round(base * 1.55),
    comparableCount: comparables.length,
    basisNote:
      'Insufficient historical category sales; baseline range projected from starting bid increment heuristics.',
  };
}

/**
 * Transparent TrustScore calculation with explicit factor breakdown.
 */
export function computeTrustScore(params: {
  verificationStatus: VerificationStatus;
  completedSales: number;
  avgRating: number;
  reviewCount: number;
  disputeCount: number;
  isSuspended?: boolean;
}): TrustScoreBreakdown {
  if (params.isSuspended || params.verificationStatus === 'restricted') {
    return {
      score: 15,
      tier: 'Restricted',
      factors: [
        {
          label: 'Account Standing',
          points: 15,
          maxPoints: 100,
          status: 'Account restricted pending compliance review',
        },
      ],
    };
  }

  const identityPts =
    params.verificationStatus === 'verified'
      ? 35
      : params.verificationStatus === 'under_review'
        ? 18
        : params.verificationStatus === 'identity_submitted'
          ? 12
          : 5;

  const fulfillmentPts = Math.min(25, params.completedSales * 5);
  const ratingPts =
    params.reviewCount > 0 ? Math.round((params.avgRating / 5) * 25) : 12;
  const standingPts = Math.max(0, 15 - params.disputeCount * 5);

  const total = Math.max(0, Math.min(100, identityPts + fulfillmentPts + ratingPts + standingPts));
  const tier: TrustScoreBreakdown['tier'] =
    total >= 85 && params.verificationStatus === 'verified'
      ? 'Elite Verified'
      : params.verificationStatus === 'verified'
        ? 'Verified'
        : total >= 55
          ? 'Standard'
          : 'New';

  return {
    score: total,
    tier,
    factors: [
      {
        label: 'Identity Verification',
        points: identityPts,
        maxPoints: 35,
        status: params.verificationStatus.replace('_', ' '),
      },
      {
        label: 'Order Fulfillment',
        points: fulfillmentPts,
        maxPoints: 25,
        status: `${params.completedSales} completed sales`,
      },
      {
        label: 'Buyer Feedback',
        points: ratingPts,
        maxPoints: 25,
        status:
          params.reviewCount > 0
            ? `${params.avgRating.toFixed(1)}/5 (${params.reviewCount} reviews)`
            : 'No reviews yet (baseline)',
      },
      {
        label: 'Dispute Standing',
        points: standingPts,
        maxPoints: 15,
        status:
          params.disputeCount === 0
            ? 'Zero unresolved disputes'
            : `${params.disputeCount} dispute(s) recorded`,
      },
    ],
  };
}

/**
 * Deterministic recommendation scoring based on preferred categories, saved items & price affinity.
 */
export function recommendAuctions(
  auctions: AuctionItem[],
  preferredCategories: string[],
  recentlyViewedIds: string[],
  savedIds: string[],
  personalizationEnabled: boolean
): AuctionItem[] {
  const activePool = auctions.filter((a) => a.status === 'active');
  if (!personalizationEnabled || (preferredCategories.length === 0 && savedIds.length === 0)) {
    return [...activePool]
      .sort((a, b) => (b.bid_count ?? 0) - (a.bid_count ?? 0))
      .slice(0, 6);
  }

  const savedSet = new Set(savedIds);
  const viewedSet = new Set(recentlyViewedIds);
  const savedCategories = new Set(
    auctions.filter((a) => savedSet.has(a.id)).map((a) => a.category)
  );
  const prefSet = new Set([...preferredCategories, ...savedCategories]);

  return [...activePool]
    .map((auction) => {
      let score = (auction.bid_count ?? 0) * 2;
      if (prefSet.has(auction.category)) score += 30;
      if (auction.seller_verified) score += 10;
      if (viewedSet.has(auction.id)) score += 5;
      if (savedSet.has(auction.id)) score -= 5; // surface fresh discoveries first
      return { auction, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.auction);
}

/**
 * Rule-based ShieldGuard risk evaluation helper for server-side inspection.
 */
export function evaluateBidRiskSignals(params: {
  bidsInLastMinute: number;
  rejectionsInLastHour: number;
  amount: number;
  currentPrice: number;
  minIncrement: number;
}): { riskScore: number; signals: string[]; severity: 'low' | 'medium' | 'high' | 'critical' } {
  const signals: string[] = [];
  let riskScore = 0;

  if (params.bidsInLastMinute >= 6) {
    signals.push(`High velocity: ${params.bidsInLastMinute} bids in 60 seconds`);
    riskScore += 45;
  }
  if (params.rejectionsInLastHour >= 5) {
    signals.push(`Repeated rejected attempts (${params.rejectionsInLastHour} in 1h)`);
    riskScore += 30;
  }
  if (params.currentPrice > 0 && params.amount > params.currentPrice * 5 && params.amount > 100000) {
    signals.push('Outlier jump (>5x current bid price)');
    riskScore += 35;
  }

  riskScore = Math.min(100, riskScore);
  const severity: 'low' | 'medium' | 'high' | 'critical' =
    riskScore >= 80
      ? 'critical'
      : riskScore >= 55
        ? 'high'
        : riskScore >= 30
          ? 'medium'
          : 'low';

  return { riskScore, signals, severity };
}
