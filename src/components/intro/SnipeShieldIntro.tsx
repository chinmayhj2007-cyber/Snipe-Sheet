'use client';

import { useCallback, useEffect, useState } from 'react';
import { GlassIconReveal } from '@/components/ui/liquid-glass-logo-reveal';

const INTRO_SESSION_KEY = 'snipe_shield_intro_seen';
const FADE_DURATION_MS = 650;
const POST_REVEAL_HOLD_MS = 450;
const SAFETY_TIMEOUT_MS = 7000;
const FALLBACK_HOLD_MS = 1400;

export function SnipeShieldIntro() {
  const [phase, setPhase] = useState<'init' | 'playing' | 'fading' | 'done'>('init');
  const [reducedMotion, setReducedMotion] = useState(false);

  const finishIntro = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch {
      // Ignore storage restrictions
    }

    setPhase((prev) => (prev === 'playing' || prev === 'init' ? 'fading' : prev));
  }, []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(INTRO_SESSION_KEY) === '1') {
        document.documentElement.dataset.intro = 'done';
        setPhase('done');
        return;
      }
    } catch {
      // Proceed if sessionStorage is unavailable
    }

    setPhase('playing');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setReducedMotion(true);
      const t = window.setTimeout(finishIntro, 850);
      return () => window.clearTimeout(t);
    }

    // Safety guard so slow devices or blocked WebGL never trap the user
    const safetyTimer = window.setTimeout(finishIntro, SAFETY_TIMEOUT_MS);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        finishIntro();
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(safetyTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [finishIntro]);

  useEffect(() => {
    if (phase !== 'fading') return;
    const timer = window.setTimeout(() => {
      document.documentElement.dataset.intro = 'done';
      setPhase('done');
    }, FADE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'done') {
    return null;
  }

  return (
    <div
      id="snipe-shield-intro"
      aria-label="Snipe Shield intro animation"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] transition-opacity duration-[650ms] ease-out ${
        phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative h-full w-full">
        {phase === 'playing' ? (
          reducedMotion ? (
            <div className="flex h-full w-full items-center justify-center bg-[#000000]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/snipe-shield-logo.webp"
                alt="Snipe Shield"
                className="h-44 w-44 object-contain sm:h-56 sm:w-56"
              />
            </div>
          ) : (
            <GlassIconReveal
              logo="/snipe-shield-logo.webp"
              label="Snipe Shield"
              look="dark"
              background="#000000"
              plateColor="#08090c"
              iconPlate={true}
              keepPlate={false}
              originalColors={true}
              tileSize={340}
              logoScale={0.78}
              finalScale={1}
              loop={false}
              speed={1}
              tuning={{
                startSize: 0.18,
                startZoom: 1.75,
                glide: 2.0,
                present: 2.15,
                opticalDepth: 0.85,
                bevelWidth: 0.2,
                dispersion: 0.85,
                colorBleed: 0.35,
                sheen: 1.15,
                halo: 0.9,
                ripple: 0.55,
                specular: 1.05,
              }}
              onComplete={() => {
                window.setTimeout(finishIntro, POST_REVEAL_HOLD_MS);
              }}
              onFallback={() => {
                window.setTimeout(finishIntro, FALLBACK_HOLD_MS);
              }}
              className="h-full w-full cursor-default"
            />
          )
        ) : null}

        {/* Subtle brand caption and skip action matching Snipe Shield typography */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 transition-opacity duration-500 ${
            phase === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p className="text-sm font-medium italic tracking-wide text-white/75">
            Snipe Shield
          </p>
          <button
            type="button"
            onClick={finishIntro}
            className="pointer-events-auto cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1 text-[11px] font-medium text-white/55 backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}
