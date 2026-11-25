'use client';

import { ShieldAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { getTurnstileSiteKey } from '@/lib/supabase/config';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string | null) => void;
  resetSignal?: number;
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function TurnstileWidget({
  onTokenChange,
  resetSignal = 0,
}: TurnstileWidgetProps) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [scriptFailed, setScriptFailed] = useState(false);
  const widgetDomId = useId();

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!siteKey) {
      onTokenChangeRef.current(null);
      return;
    }

    let cancelled = false;

    function mountWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        size: 'normal',
        callback: (token: string) => {
          onTokenChangeRef.current(token);
        },
        'expired-callback': () => {
          onTokenChangeRef.current(null);
        },
        'error-callback': () => {
          onTokenChangeRef.current(null);
        },
      });
    }

    if (window.turnstile) {
      mountWidget();
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const handleLoad = () => mountWidget();
      const handleError = () => {
        if (!cancelled) {
          setScriptFailed(true);
          onTokenChangeRef.current(null);
        }
      };

      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);

      // In case script finished loading between check and addEventListener
      if (window.turnstile) {
        mountWidget();
      }

      return () => {
        cancelled = true;
        script?.removeEventListener('load', handleLoad);
        script?.removeEventListener('error', handleError);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      onTokenChangeRef.current(null);
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  if (!siteKey) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-950/30 px-3 py-2 text-[11px] leading-snug text-amber-100/90 backdrop-blur-md"
      >
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden="true" />
        <span>
          CAPTCHA protection inactive: set{' '}
          <code className="font-mono text-white">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> &amp;{' '}
          <code className="font-mono text-white">TURNSTILE_SECRET_KEY</code> in{' '}
          <code className="font-mono text-white">.env.local</code>.
        </span>
      </div>
    );
  }

  if (scriptFailed) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-2xl border border-rose-300/25 bg-rose-950/45 px-3.5 py-2.5 text-[11px] text-rose-100 backdrop-blur-md"
      >
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Unable to load Cloudflare Turnstile check. Check your connection or ad-blocker.</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div
        id={widgetDomId}
        ref={containerRef}
        aria-label="Security verification"
        className="flex min-h-[65px] w-full max-w-full items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-0.5 backdrop-blur-md"
      />
    </div>
  );
}
