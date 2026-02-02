'use client';

import { Lock, Shield, Eye } from 'lucide-react';

// PrivacyIndicator Component
interface PrivacyIndicatorProps {
  auctionId: string;
}

export function PrivacyIndicator({ auctionId }: PrivacyIndicatorProps) {
  return (
    <div className="privacy-indicator">
      <div className="privacy-dot" />
      <div className="flex items-center gap-2 text-sm">
        <Lock className="w-4 h-4 text-primary-400" />
        <span className="font-medium text-primary-400">
          100% Private Bidding
        </span>
      </div>
      <div className="text-xs text-text-muted ml-6">
        All bids hidden via zero-knowledge proofs
      </div>
    </div>
  );
}
