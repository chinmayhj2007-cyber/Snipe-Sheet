export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

const PLACEHOLDER_MARKERS = [
  'your-project-ref',
  'your-supabase-url',
  'your-anon-key',
  'placeholder',
  'example.supabase.co',
];

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function containsPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

export function getSupabaseEnv(): SupabaseEnvConfig {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

  const isConfigured =
    url.length > 0 &&
    anonKey.length > 20 &&
    isValidHttpUrl(url) &&
    !containsPlaceholder(url) &&
    !containsPlaceholder(anonKey);

  return {
    url,
    anonKey,
    isConfigured,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv().isConfigured;
}

export function isAppleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true';
}

export function getTurnstileSiteKey(): string {
  const key = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();
  if (!key || containsPlaceholder(key)) {
    return '';
  }
  return key;
}

export function isTurnstileConfigured(): boolean {
  return getTurnstileSiteKey().length > 0;
}
