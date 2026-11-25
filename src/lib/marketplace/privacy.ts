/**
 * Privacy helper to mask usernames according to SnipeShield privacy rules.
 * Examples:
 * - "bidder_12349" -> "b***9"
 * - "Seller"       -> "S***r"
 * - "Rohit Sharma" -> "R***a"
 */
export function maskBidderName(name?: string | null): string {
  if (!name) return 'Anonymous';
  const clean = name.trim();
  if (clean.length <= 1) return '*';
  if (clean.length === 2) return `${clean[0]}*`;
  if (clean.length === 3) return `${clean[0]}*${clean[2]}`;
  return `${clean[0]}***${clean[clean.length - 1]}`;
}
