'use client';

import { evaluatePasswordStrength, type PasswordStrengthLevel } from '@/lib/auth/validation';

interface PasswordStrengthMeterProps {
  password: string;
}

const LEVEL_STYLES: Record<
  PasswordStrengthLevel,
  { barClass: string; textClass: string }
> = {
  Weak: {
    barClass: 'bg-rose-400/90',
    textClass: 'text-rose-300',
  },
  Medium: {
    barClass: 'bg-amber-400/90',
    textClass: 'text-amber-300',
  },
  Strong: {
    barClass: 'bg-sky-400/90',
    textClass: 'text-sky-300',
  },
  'Very Strong': {
    barClass: 'bg-emerald-400/95',
    textClass: 'text-emerald-300',
  },
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) {
    return null;
  }

  const result = evaluatePasswordStrength(password);
  const style = LEVEL_STYLES[result.level];

  return (
    <div
      aria-live="polite"
      className="mt-2 space-y-1.5 px-1"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={`h-1 rounded-full transition-colors duration-200 ${
                segment <= result.score ? style.barClass : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        <span className={`text-[11px] font-medium ${style.textClass}`}>
          {result.level}
        </span>
      </div>

      {result.suggestions.length > 0 ? (
        <p className="text-[11px] leading-snug text-white/60">
          {result.suggestions.slice(0, 2).join(' · ')}
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-emerald-200/80">
          Meets all length, case, number, and symbol requirements.
        </p>
      )}
    </div>
  );
}
