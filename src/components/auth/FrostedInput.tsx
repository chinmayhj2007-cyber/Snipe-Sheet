'use client';

import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useId, useState } from 'react';

interface FrostedInputProps {
  label: string;
  name: string;
  type: 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
}

export function FrostedInput({
  label,
  name,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled = false,
  required = true,
  minLength,
}: FrostedInputProps) {
  const inputId = useId();
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : 'email';

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block pl-1 text-xs font-normal tracking-[0.01em] text-white/80"
      >
        {label}
      </label>

      <div className="flex h-[46px] w-full items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.045] px-4 backdrop-blur-md transition-colors focus-within:border-white/50 focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-white/15">
        {isPassword ? (
          <Lock className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
        ) : (
          <Mail className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
        )}

        <input
          id={inputId}
          name={name}
          type={resolvedType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          minLength={minLength}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            className="-mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showPassword ? (
              <Eye className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
