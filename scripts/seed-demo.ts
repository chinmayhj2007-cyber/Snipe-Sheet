/**
 * SnipeShield Controlled Demo Data Seeder (Part 16)
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node --experimental-strip-types scripts/seed-demo.ts
 *   Add `--reset` to delete all demo data (is_demo = true) before seeding.
 *
 * Strictly uses `is_demo = true` so demo data is never confused with genuine production accounts.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Never run demo seeding without service role credentials in server env.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_SELLERS = [
  { name: 'DEMO · QuantumRig Hardware', email: 'demo.seller1@snipeshield.local', spec: 'Laptops & Workstations' },
  { name: 'DEMO · Chronos Vintage Vault', email: 'demo.seller2@snipeshield.local', spec: 'Antiques & Timepieces' },
  { name: 'DEMO · Apex Camera Studio', email: 'demo.seller3@snipeshield.local', spec: 'Cameras & Optics' },
  { name: 'DEMO · SonicForge Acoustics', email: 'demo.seller4@snipeshield.local', spec: 'Audio & Studio' },
  { name: 'DEMO · PixelForge GPUs', email: 'demo.seller5@snipeshield.local', spec: 'Gaming & Consoles' },
  { name: 'DEMO · Gallery Obsidian', email: 'demo.seller6@snipeshield.local', spec: 'Art & Prints' },
  { name: 'DEMO · Heritage Collectibles IN', email: 'demo.seller7@snipeshield.local', spec: 'Collectibles' },
  { name: 'DEMO · Atelier Luxe Authenticated', email: 'demo.seller8@snipeshield.local', spec: 'Fashion & Luxury' },
  { name: 'DEMO · VoltDrive Mobility', email: 'demo.seller9@snipeshield.local', spec: 'Vehicles & EVs' },
  { name: 'DEMO · LabCore Precision', email: 'demo.seller10@snipeshield.local', spec: 'Industrial Equipment' },
];

const DEMO_AUCTIONS = [
  { title: 'MacBook Pro 16" M3 Max (64GB / 2TB)', cat: 'Laptops', cond: 'Mint', start: 185000, inc: 2500, hours: 18, sellerIdx: 0 },
  { title: 'ThinkPad P16 Gen 2 Mobile Workstation', cat: 'Laptops', cond: 'Like New', start: 95000, inc: 1500, hours: 36, sellerIdx: 0 },
  { title: '1968 Omega Seamaster De Ville Automatic', cat: 'Antiques', cond: 'Good', start: 68000, inc: 1500, hours: 12, sellerIdx: 1 },
  { title: 'Victorian Brass Marine Chronometer', cat: 'Antiques', cond: 'Good', start: 42000, inc: 1000, hours: 48, sellerIdx: 1 },
  { title: 'Sony Alpha a7R V Mirrorless Body', cat: 'Cameras', cond: 'Mint', start: 215000, inc: 2500, hours: 22, sellerIdx: 2 },
  { title: 'Leica Summilux-M 50mm f/1.4 ASPH', cat: 'Cameras', cond: 'Like New', start: 245000, inc: 5000, hours: 60, sellerIdx: 2 },
  { title: 'Sennheiser HD 800 S Audiophile Headphones', cat: 'Audio', cond: 'Mint', start: 82000, inc: 1500, hours: 14, sellerIdx: 3 },
  { title: 'Universal Audio Apollo Twin X Duo', cat: 'Audio', cond: 'Like New', start: 54000, inc: 1000, hours: 30, sellerIdx: 3 },
  { title: 'NVIDIA RTX 4090 Founders Edition 24GB', cat: 'Gaming', cond: 'Mint', start: 135000, inc: 2500, hours: 6, sellerIdx: 4 },
  { title: 'Steam Deck OLED 1TB Limited Translucent', cat: 'Gaming', cond: 'New', start: 52000, inc: 1000, hours: 20, sellerIdx: 4 },
  { title: 'Signed Giclée Monochrome Archival Print #4/25', cat: 'Art', cond: 'New', start: 18000, inc: 500, hours: 40, sellerIdx: 5 },
  { title: 'Brushed Bronze Kinetic Desk Sculpture', cat: 'Art', cond: 'New', start: 29000, inc: 1000, hours: 50, sellerIdx: 5 },
  { title: '1999 Base Set Charizard PSA 8 Slab', cat: 'Collectibles', cond: 'Mint', start: 75000, inc: 2000, hours: 9, sellerIdx: 6 },
  { title: 'Signed Sachin Tendulkar Match Miniature Bat', cat: 'Collectibles', cond: 'Mint', start: 45000, inc: 1500, hours: 28, sellerIdx: 6 },
  { title: 'Jordan 1 Retro High OG "Shadow" DS', cat: 'Fashion', cond: 'New', start: 26000, inc: 500, hours: 16, sellerIdx: 7 },
  { title: 'Tissot PRX Powermatic 80 Ice Blue', cat: 'Fashion', cond: 'Like New', start: 41000, inc: 1000, hours: 34, sellerIdx: 7 },
  { title: 'Ather 450 Apex Indium Blue Collector Spec', cat: 'Vehicles', cond: 'Like New', start: 145000, inc: 5000, hours: 72, sellerIdx: 8 },
  { title: 'Royal Enfield Continental GT 650 Chrome (2024)', cat: 'Vehicles', cond: 'Mint', start: 265000, inc: 5000, hours: 96, sellerIdx: 8 },
  { title: 'Bambu Lab X1 Carbon Combo 3D Printer', cat: 'Industrial', cond: 'Like New', start: 88000, inc: 2000, hours: 19, sellerIdx: 9 },
  { title: 'Fluke 87V Industrial True-RMS Multimeter Kit', cat: 'Industrial', cond: 'New', start: 28000, inc: 500, hours: 42, sellerIdx: 9 },
  { title: 'iPhone 16 Pro Max 512GB Natural Titanium', cat: 'Smartphones', cond: 'New', start: 118000, inc: 2000, hours: 8, sellerIdx: 0 },
  { title: 'Samsung Galaxy Z Fold 6 Crafted Black', cat: 'Smartphones', cond: 'Mint', start: 105000, inc: 2000, hours: 26, sellerIdx: 0 },
  { title: 'Specialized Tarmac SL7 Carbon Frameset', cat: 'Sports', cond: 'Like New', start: 160000, inc: 3000, hours: 44, sellerIdx: 6 },
  { title: 'La Marzocco Linea Micra Home Espresso Machine', cat: 'Home', cond: 'Mint', start: 230000, inc: 5000, hours: 54, sellerIdx: 3 },
];

async function resetDemoData() {
  console.log('Resetting all DEMO auctions and profiles...');
  await supabase.from('auctions').delete().eq('is_demo', true);
  await supabase.from('reviews').delete().eq('is_demo', true);
  const { data: demoUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_demo', true);
  for (const u of demoUsers ?? []) {
    await supabase.auth.admin.deleteUser(u.id);
  }
  console.log('DEMO reset complete.');
}

async function seed() {
  if (process.argv.includes('--reset')) {
    await resetDemoData();
    if (process.argv.includes('--reset-only')) return;
  }

  const sellerIds: string[] = [];

  for (const s of DEMO_SELLERS) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', s.email)
      .maybeSingle();

    if (existing) {
      sellerIds.push(existing.id);
      continue;
    }

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: s.email,
      password: `DemoPass!${Math.random().toString(36).slice(2, 10)}`,
      email_confirm: true,
      user_metadata: { role: 'seller' },
    });

    if (error || !created.user) {
      console.error('Failed creating demo seller:', s.email, error?.message);
      continue;
    }

    // Notice: Never automatically mark demo sellers as verified! Keep verification_status = 'unverified'.
    await supabase
      .from('profiles')
      .update({
        full_name: s.name,
        role: 'seller',
        specialization: s.spec,
        bio: `Simulated DEMO seller specializing in ${s.spec}.`,
        is_demo: true,
        verification_status: 'unverified',
        trust_score: 62,
      })
      .eq('id', created.user.id);

    sellerIds.push(created.user.id);
  }

  const now = Date.now();
  for (const item of DEMO_AUCTIONS) {
    const sellerId = sellerIds[item.sellerIdx] ?? sellerIds[0];
    if (!sellerId) continue;

    const endsAt = new Date(now + item.hours * 3600_000).toISOString();
    const { error } = await supabase.from('auctions').insert({
      seller_id: sellerId,
      title: item.title,
      description: `[DEMO LISTING] Verified demonstration item in ${item.cat}. Includes ShieldLock bidding & SnipeShield anti-snipe protection.`,
      category: item.cat,
      condition: item.cond,
      starting_price: item.start,
      current_price: item.start,
      min_increment: item.inc,
      starts_at: new Date(now - 3600_000).toISOString(),
      ends_at: endsAt,
      original_ends_at: endsAt,
      status: 'active',
      is_demo: true,
    });

    if (error) {
      console.error('Failed inserting demo auction:', item.title, error.message);
    }
  }

  console.log(`Seeded ${sellerIds.length} DEMO sellers and ${DEMO_AUCTIONS.length} DEMO auctions.`);
}

void seed();
