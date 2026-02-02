/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Lock } from 'lucide-react';
// BidHistory Component
interface BidHistoryProps {
  auctionId: string;
  userAddress: string;
}

export function BidHistory({ auctionId, userAddress }: BidHistoryProps) {
  // This would fetch user's bids from the API
  const bids: any[] = []; // Placeholder

  if (bids.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold text-text-primary mb-4">Your Bids</h3>
        <div className="text-center py-8 text-text-muted">
          You haven`t placed any bids on this auction yet.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-text-primary mb-4">Your Bid History</h3>
      <div className="space-y-3">
        {bids.map((bid: any, index: number) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-background-tertiary border border-white/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-primary-400" />
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    Bid #{index + 1}
                  </div>
                  <div className="text-xs text-text-muted">
                    {bid.revealed ? 'Revealed' : 'Hidden'}
                  </div>
                </div>
              </div>
              {bid.revealed && (
                <div className="text-lg font-bold text-text-primary">
                  {bid.amount} SOL
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}