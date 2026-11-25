'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

export type LegalDocumentType = 'terms' | 'privacy';

interface LegalModalProps {
  documentType: LegalDocumentType | null;
  onClose: () => void;
  onAccept: (doc: LegalDocumentType) => void;
}

export function LegalModal({ documentType, onClose, onAccept }: LegalModalProps) {
  useEffect(() => {
    if (!documentType) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [documentType, onClose]);

  if (!documentType) {
    return null;
  }

  const isTerms = documentType === 'terms';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="smoky-glass-card flex max-h-[82dvh] w-full max-w-md flex-col rounded-[28px] border border-white/25 p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3.5">
          <div>
            <p className="text-[11px] font-medium italic tracking-tight text-white/65">
              Snipe Shield
            </p>
            <h2 id="legal-modal-title" className="text-base font-semibold text-white">
              {isTerms ? 'Terms & Conditions' : 'Privacy Policy'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close document"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition hover:border-white/40 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-3.5 overflow-y-auto pr-1 text-xs leading-relaxed text-white/80">
          {isTerms ? (
            <>
              <p className="text-white/60">Effective Date: November 2026 • Team DedSec (Avishkar&apos;26)</p>
              <div>
                <h3 className="font-semibold text-white">1. Account Eligibility &amp; Roles</h3>
                <p className="mt-1">
                  You must register with accurate contact information and choose either a{' '}
                  <strong className="text-white">Bidder</strong> or{' '}
                  <strong className="text-white">Seller</strong> role. You are responsible for keeping
                  your login credentials and OTP codes confidential.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">2. Live Bidding &amp; Anti-Sniping Rules</h3>
                <p className="mt-1">
                  All bids placed on active auctions are binding commitments. Bids submitted in the final
                  30 seconds automatically trigger anti-sniping timer extensions to ensure fair competition.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">3. Seller Obligations &amp; Reserve Prices</h3>
                <p className="mt-1">
                  Sellers must describe listed tech and gadget items truthfully and honor winning bids
                  that meet or exceed the stated reserve price when the auction closes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">4. Prohibited Abuse</h3>
                <p className="mt-1">
                  Automated bidding bots, shill bidding, CAPTCHA circumvention, and unauthorized scraping
                  are strictly prohibited and result in immediate account suspension.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-white/60">Effective Date: November 2026 • Team DedSec (Avishkar&apos;26)</p>
              <div>
                <h3 className="font-semibold text-white">1. Information We Collect</h3>
                <p className="mt-1">
                  We collect only the information required to operate your account: your email address,
                  optional mobile number (for OTP login), selected role (Bidder or Seller), and
                  timestamped bid/auction records.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">2. Authentication &amp; Credential Security</h3>
                <p className="mt-1">
                  Passwords are hashed and managed securely by Supabase Auth—Snipe Shield never stores or
                  logs plain-text passwords. Human verification is protected by Cloudflare Turnstile.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">3. Row-Level Data Isolation</h3>
                <p className="mt-1">
                  Profile records are protected with PostgreSQL Row Level Security (RLS), ensuring only
                  your authenticated session can access your private profile details.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">4. Data Retention &amp; Deletion</h3>
                <p className="mt-1">
                  We do not sell personal data or load third-party ad trackers. You may request account
                  deletion at any time, which cascades to remove your private profile record.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2.5 border-t border-white/15 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-xs font-medium text-white/85 transition hover:border-white/35 hover:bg-white/10"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onAccept(documentType);
              onClose();
            }}
            className="smoky-cta-btn flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full text-xs font-medium text-white transition"
          >
            Accept &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
