'use client';

import { useState } from 'react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ShinyButton } from '@/components/ui/shiny-button';

interface DashboardWelcomeActionsProps {
  isSeller: boolean;
}

export function DashboardWelcomeActions({ isSeller }: DashboardWelcomeActionsProps) {
  const [showStatusNotice, setShowStatusNotice] = useState(false);

  return (
    <div className="mt-5 space-y-3">
      {showStatusNotice ? (
        <div
          role="status"
          className="rounded-2xl border border-white/20 bg-white/[0.06] px-4 py-2.5 text-center text-xs leading-relaxed text-white/85 backdrop-blur-md"
        >
          {isSeller
            ? 'Your Seller workspace is authenticated and ready. Live auction listing launches in Step 2.'
            : 'Your Bidder session is authenticated and ready. Live bidding rooms & anti-sniping launch in Step 2.'}
        </div>
      ) : null}

      <ShinyButton
        label="START NOW"
        onClick={() => setShowStatusNotice((prev) => !prev)}
        fillColor="#0b0c10"
        labelColor="#ffffff"
        accentColor="#a7adb6"
        accentSoftColor="#e2e4e8"
        cornerRadius={9999}
        speckleOpacity={0.28}
        className="flex h-[46px] w-full items-center justify-center !p-0 !text-sm !font-medium !tracking-[0.04em] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      />

      <LogoutButton variant="secondary" />
    </div>
  );
}
