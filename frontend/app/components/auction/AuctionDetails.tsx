/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { Eye } from 'lucide-react';

// AuctionDetails Component
interface AuctionDetailsProps {
  auction: any;
}

export function AuctionDetails({ auction }: AuctionDetailsProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold text-text-primary mb-4">Auction Details</h3>

      <div className="space-y-4">
        {/* Product Type */}
        <div>
          <div className="text-sm text-text-muted mb-1">Product Type</div>
          <div className="text-base text-text-primary font-medium capitalize">
            {auction.productType}
          </div>
        </div>

        {/* Category */}
        <div>
          <div className="text-sm text-text-muted mb-1">Category</div>
          <div className="text-base text-text-primary font-medium">
            {auction.category}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <div className="text-sm text-text-muted mb-1">Payment Method</div>
          <div className="text-base text-text-primary font-medium">
            SOL (Solana)
          </div>
        </div>

        {/* Minimum Increment */}
        {auction.minBidIncrement && (
          <div>
            <div className="text-sm text-text-muted mb-1">Minimum Bid Increment</div>
            <div className="text-base text-text-primary font-medium">
              {auction.minBidIncrement} SOL
            </div>
          </div>
        )}

        {/* Bid Collateral */}
        {auction.bidCollateral && (
          <div>
            <div className="text-sm text-text-muted mb-1">Bid Collateral</div>
            <div className="text-base text-text-primary font-medium">
              {auction.bidCollateral} SOL (refunded)
            </div>
          </div>
        )}

        {/* Privacy Guarantee */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary-500/10">
            <Eye className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <strong className="text-text-primary">Privacy Guaranteed:</strong> All bid
              amounts are hidden using zero-knowledge proofs until the reveal phase.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
