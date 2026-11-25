import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  evaluatePasswordStrength,
  normalizeRole,
  validateEmail,
  validateOtpCode,
  validatePhoneNumber,
  validateSignUpInput,
} from '../src/lib/auth/validation.ts';
import {
  calculateTrueCost,
  computePriceInsights,
  computeTrustScore,
  evaluateBidRiskSignals,
  recommendAuctions,
} from '../src/lib/marketplace/intelligence.ts';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from '../src/lib/payments/razorpay.ts';
import type { AuctionItem } from '../src/lib/marketplace/types.ts';

test('Auth validation: role normalization & signup blocks privilege escalation', () => {
  assert.equal(normalizeRole('bidder'), 'bidder');
  assert.equal(normalizeRole('seller'), 'seller');
  assert.equal(normalizeRole('admin'), 'admin');
  assert.equal(normalizeRole('unknown'), 'bidder');

  // Public self-signup must not create admin even if passed
  const res = validateSignUpInput({
    email: 'user@example.com',
    password: 'StrongPassword!123',
    confirmPassword: 'StrongPassword!123',
    role: 'admin',
  });
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.role, 'bidder');
  }
});

test('Auth validation: email, phone, OTP, password strength', () => {
  assert.equal(validateEmail('bad-email').valid, false);
  assert.equal(validateEmail('alice@example.com').valid, true);
  assert.equal(validatePhoneNumber('+91', '9876543210').valid, true);
  assert.equal(validatePhoneNumber('+91', '12345').valid, false);
  assert.equal(validateOtpCode('123456').valid, true);
  assert.equal(validateOtpCode('123').valid, false);
  assert.equal(evaluatePasswordStrength('Weak1').level, 'Weak');
  assert.equal(evaluatePasswordStrength('VeryStrong#Pass2026').level, 'Very Strong');
});

test('TrueCost breakdown calculates fee (capped), shipping, and 18% fee GST', () => {
  const low = calculateTrueCost(10000, 500);
  assert.equal(low.winningBid, 10000);
  assert.equal(low.platformFee, 250);
  assert.equal(low.taxAmount, 45);
  assert.equal(low.shippingCost, 500);
  assert.equal(low.totalPayable, 10795);

  const high = calculateTrueCost(500000, 0);
  assert.equal(high.platformFee, 2500); // capped at ₹2,500
  assert.equal(high.taxAmount, 450);
  assert.equal(high.totalPayable, 502950);
});

test('TrustScore computes transparent breakdown and respects restriction', () => {
  const verified = computeTrustScore({
    verificationStatus: 'verified',
    completedSales: 6,
    avgRating: 4.8,
    reviewCount: 10,
    disputeCount: 0,
  });
  assert.equal(verified.tier, 'Elite Verified');
  assert.ok(verified.score >= 85);

  const restricted = computeTrustScore({
    verificationStatus: 'restricted',
    completedSales: 10,
    avgRating: 5,
    reviewCount: 10,
    disputeCount: 0,
  });
  assert.equal(restricted.tier, 'Restricted');
  assert.equal(restricted.score, 15);
});

test('ShieldGuard AI rule-based fraud evaluator detects bursts and price outliers', () => {
  const normal = evaluateBidRiskSignals({
    bidsInLastMinute: 1,
    rejectionsInLastHour: 0,
    amount: 12000,
    currentPrice: 10000,
    minIncrement: 500,
  });
  assert.equal(normal.riskScore, 0);
  assert.equal(normal.severity, 'low');

  const highRisk = evaluateBidRiskSignals({
    bidsInLastMinute: 8,
    rejectionsInLastHour: 6,
    amount: 500000,
    currentPrice: 10000,
    minIncrement: 500,
  });
  assert.equal(highRisk.severity, 'critical');
  assert.ok(highRisk.riskScore >= 80);
  assert.equal(highRisk.signals.length, 3);
});

test('Price Insights & Recommendations handle comparable listings cleanly', () => {
  const baseAuctions: AuctionItem[] = [
    {
      id: 'a1',
      seller_id: 's1',
      seller_name: 'Seller 1',
      seller_verified: true,
      title: 'Item 1',
      description: 'Desc 1',
      category: 'Laptops',
      condition: 'Mint',
      image_url: null,
      image_urls: [],
      starting_price: 50000,
      current_price: 60000,
      min_increment: 1000,
      reserve_price: null,
      highest_bidder_id: null,
      highest_bidder_name: null,
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600_000).toISOString(),
      extensions_count: 0,
      created_at: new Date().toISOString(),
      bid_count: 5,
    },
    {
      id: 'a2',
      seller_id: 's2',
      seller_name: 'Seller 2',
      seller_verified: false,
      title: 'Item 2',
      description: 'Desc 2',
      category: 'Laptops',
      condition: 'Good',
      image_url: null,
      image_urls: [],
      starting_price: 70000,
      current_price: 85000,
      min_increment: 1000,
      reserve_price: null,
      highest_bidder_id: null,
      highest_bidder_name: null,
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600_000).toISOString(),
      extensions_count: 0,
      created_at: new Date().toISOString(),
      bid_count: 2,
    },
  ];

  const insight = computePriceInsights('Laptops', 50000, baseAuctions);
  assert.equal(insight.comparableCount, 2);
  assert.ok(insight.medianEstimate >= 60000);

  const recs = recommendAuctions(baseAuctions, ['Laptops'], [], [], true);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].id, 'a1');
});

test('Razorpay HMAC payment & webhook signature verification rejects tampered signatures', () => {
  const secret = 'rzp_test_secret_key_123';
  const orderId = 'order_test_001';
  const paymentId = 'pay_test_001';
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(
    verifyRazorpayPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: sig,
      secret,
    }),
    true
  );

  assert.equal(
    verifyRazorpayPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: 'tampered_sig',
      secret,
    }),
    false
  );

  const rawBody = JSON.stringify({ event: 'payment.captured' });
  const whSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  assert.equal(verifyRazorpayWebhookSignature(rawBody, whSig, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(rawBody, 'bad', secret), false);
});
