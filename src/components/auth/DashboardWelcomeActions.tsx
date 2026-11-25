'use client';

import { useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ShinyButton } from '@/components/ui/shiny-button';

interface DashboardWelcomeActionsProps {
  isSeller: boolean;
}

export function DashboardWelcomeActions({ isSeller }: DashboardWelcomeActionsProps) {
  const router = useRouter();

  return (
    <div className="mt-5 space-y-3">
      <ShinyButton
        label="START NOW"
        onClick={() => router.push(isSeller ? '/seller/home' : '/bidder/home')}
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
