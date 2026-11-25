'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './config';

let browserClient: SupabaseClient | null = null;

/**
 * Returns the single shared Supabase browser client instance.
 * Returns null when Supabase environment variables are not configured (Demo Mode).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey, isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return null;
  }

  browserClient = createBrowserClient(url, anonKey, {
    isSingleton: true,
  });

  return browserClient;
}
