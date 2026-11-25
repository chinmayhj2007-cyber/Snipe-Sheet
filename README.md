# Snipe Shield — Step 1: Secure Authentication Portal

**Avishkar'26 24-Hour Hackathon** | **Team DedSec** (`AV26-7C477410E5`)  
Problem Statement #12: Real-Time Online Auction & Bidding Platform

This repository currently implements **Step 1 only**: the complete, production-oriented Supabase authentication system built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **`@supabase/ssr`**.

---

## Implemented Routes

- `/login` — Email/password login, "Remember me", "Forgot Password?" link, Google OAuth, Apple OAuth guard
- `/signup` — Bidder / Seller role toggle, email + password + confirm password (min 8 chars), email verification flow
- `/reset-password` — Real Supabase password-reset email flow with back button to `/login`
- `/auth/callback` — Handles email confirmation, password-reset recovery, and OAuth callbacks, then redirects to `/dashboard` (or `/login` on invalid/expired links)
- `/dashboard` — Server-protected dashboard displaying authenticated email, `Bidder` / `Seller` role badge, and **Log Out**

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In your project dashboard, navigate to **Project Settings → API** (or **Data API** / **API Keys**).
3. Copy:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **Publishable / `anon` public key**

---

## 2. Run the Database & RLS Schema

1. Open your Supabase Dashboard → **SQL Editor → New Query**.
2. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.
3. This creates `public.profiles`, enables **Row Level Security (RLS)** so users can only read/insert/update their own profile row, and installs the `private.handle_new_user()` trigger on `auth.users` to store the chosen `bidder` / `seller` role automatically.

---

## 3. Enable Email Confirmations, Phone OTP, Google OAuth & Cloudflare Turnstile

1. In Supabase Dashboard → **Authentication → Providers → Email**:
   - Ensure **Confirm email** is enabled.
2. *(For Phone + OTP Login)* In **Authentication → Providers → Phone**:
   - Toggle **Phone** on and configure your SMS provider (e.g., Twilio, MessageBird, or Vonage) in Supabase.
3. In **Authentication → URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (or your production Vercel URL once deployed).
   - Add Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://<your-vercel-domain>/auth/callback`
4. *(Optional)* To enable **Google Sign-In**:
   - Go to **Authentication → Providers → Google**, toggle it on, and add your Google Cloud OAuth Client ID and Client Secret (with Supabase's callback URL registered in Google Cloud Console).
5. **Apple Sign-In:** If Apple OAuth is not configured, tapping **Apple** safely displays `"Apple sign-in isn't set up yet."`. If you configure Apple OAuth in Supabase later, set `NEXT_PUBLIC_APPLE_AUTH_ENABLED=true`.
6. **Cloudflare Turnstile CAPTCHA:**
   - Create a Turnstile widget in [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Turnstile** with your domain(s) (including `localhost`).
   - Copy the **Site Key** into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and **Secret Key** into `TURNSTILE_SECRET_KEY`.
   - Tokens are verified server-side at `/api/auth/verify-captcha` (do not double-enable Turnstile inside Supabase Auth settings, as Turnstile tokens are single-use).

---

## 4. Configure Local Environment Variables (`.env.local`)

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Paste your values into `.env.local` (never commit `.env.local` or `.env`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
   TURNSTILE_SECRET_KEY=your-turnstile-secret-key
   ```
   *(If `.env.local` is left empty or missing, the app automatically runs in **Demo Mode**, renders all screens honestly, and informs you that Supabase / CAPTCHA is not connected yet instead of faking verification.)*

---

## 5. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 6. Configure Environment Variables & Deploy on Vercel

1. Push your code to GitHub (`.gitignore` already excludes `.env`, `.env.local`, `.next`, and `node_modules`).
2. Import the repository in **Vercel** (or run `vercel` CLI).
3. In your Vercel Project → **Settings → Environment Variables**, add the same two variables for **Production**, **Preview**, and **Development**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy (`vercel --prod` or git push), then add your `https://<your-vercel-app>.vercel.app/auth/callback` URL to Supabase **Authentication → URL Configuration → Redirect URLs**.
