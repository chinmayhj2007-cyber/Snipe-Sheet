import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './config';

/**
 * Creates a request-scoped Supabase server client for Server Components and Route Handlers.
 * Returns null when Supabase environment variables are not configured (Demo Mode).
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const { url, anonKey, isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookie mutation is disallowed;
          // proxy.ts handles refreshing and persisting cookies.
        }
      },
    },
  });
}
