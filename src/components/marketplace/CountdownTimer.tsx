'use client';

import { Clock, ShieldAlert } from 'lucide-react';
import { memo, useSyncExternalStore } from 'react';

interface CountdownTimerProps {
  startsAt: string;
  endsAt: string;
  status: string;
  compact?: boolean;
}

// Single shared 1s clock across all mounted timers; pauses automatically when tab is hidden
let sharedNow: number | null = null;
let tickerId: number | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  sharedNow = Date.now();
  listeners.forEach((cb) => cb());
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return;
  if (document.hidden) {
    if (tickerId !== null) {
      window.clearInterval(tickerId);
      tickerId = null;
    }
  } else {
    notifyListeners();
    if (listeners.size > 0 && tickerId === null) {
      tickerId = window.setInterval(notifyListeners, 1000);
    }
  }
}

function subscribeClock(callback: () => void) {
  listeners.add(callback);
  if (typeof window !== 'undefined') {
    if (sharedNow === null || tickerId === null) {
      sharedNow = Date.now();
    }
    if (listeners.size === 1) {
      if (typeof document === 'undefined' || !document.hidden) {
        tickerId = window.setInterval(notifyListeners, 1000);
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      if (tickerId !== null) {
        window.clearInterval(tickerId);
        tickerId = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

function getClientClock(): number | null {
  if (typeof window !== 'undefined' && sharedNow === null) {
    sharedNow = Date.now();
  }
  return sharedNow;
}

function getServerClock(): number | null {
  return null;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const CountdownTimer = memo(function CountdownTimer({
  startsAt,
  endsAt,
  status,
  compact = false,
}: CountdownTimerProps) {
  const nowMs = useSyncExternalStore(subscribeClock, getClientClock, getServerClock);

  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();

  // During initial SSR snapshot (null), render neutral placeholder matching layout
  if (nowMs === null || Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-white/75">
        <Clock className="h-3.5 w-3.5 text-[#a7adb6]" aria-hidden="true" />
        <span>{status === 'active' ? '--:--' : 'Ended'}</span>
      </span>
    );
  }

  if (status !== 'active' || nowMs >= endMs) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-white/50">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Ended
      </span>
    );
  }

  if (nowMs < startMs) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-white/75">
        <Clock className="h-3.5 w-3.5 text-[#a7adb6]" aria-hidden="true" />
        Starts in {formatDuration(startMs - nowMs)}
      </span>
    );
  }

  const remainingMs = endMs - nowMs;
  const isSnipeWindow = remainingMs <= 30_000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums ${
        isSnipeWindow ? 'text-amber-300' : 'text-white/90'
      }`}
    >
      {isSnipeWindow ? (
        <ShieldAlert className="h-3.5 w-3.5 animate-pulse text-amber-300" aria-hidden="true" />
      ) : (
        <Clock className="h-3.5 w-3.5 text-[#a7adb6]" aria-hidden="true" />
      )}
      <span>{formatDuration(remainingMs)}</span>
      {isSnipeWindow && !compact ? (
        <span className="rounded-full border border-amber-300/35 bg-amber-500/15 px-1.5 py-0.5 font-sans text-[10px] font-medium text-amber-200">
          30s Anti-Snipe
        </span>
      ) : null}
    </span>
  );
});
