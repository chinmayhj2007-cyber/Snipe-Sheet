/**
 * Server-authoritative clock synchronization.
 * Computes the delta between client local time and server UTC time.
 * Prevents client device clock manipulation or clock drift from affecting countdown accuracy.
 */

let serverOffsetMs = 0;
let hasSynced = false;
let syncPromise: Promise<number> | null = null;
let lastSyncTimestamp = 0;
const SYNC_INTERVAL_MS = 60_000;

export async function syncServerClock(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const t0 = performance.now();
      const res = await fetch('/api/time', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const t1 = performance.now();
      if (!res.ok) throw new Error('Failed to fetch server time');

      const data = (await res.json()) as { serverTime: number };
      const roundTrip = t1 - t0;
      // Latency compensation: server timestamp corresponds approximately to midway through request
      const estimatedServerNow = data.serverTime + roundTrip / 2;
      serverOffsetMs = estimatedServerNow - Date.now();
      hasSynced = true;
      lastSyncTimestamp = Date.now();
      return serverOffsetMs;
    } catch {
      // Fallback: preserve existing offset or 0 if fetch fails
      return serverOffsetMs;
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export function getServerClockOffset(): number {
  if (typeof window === 'undefined') return 0;
  if (!hasSynced && !syncPromise) {
    void syncServerClock();
  } else if (Date.now() - lastSyncTimestamp > SYNC_INTERVAL_MS && !syncPromise) {
    void syncServerClock();
  }
  return serverOffsetMs;
}

/**
 * Returns the current server-authoritative time in milliseconds.
 */
export function getAuthoritativeNow(): number {
  if (typeof window === 'undefined') return Date.now();
  return Date.now() + getServerClockOffset();
}
