'use client';
import { Shield } from 'lucide-react';

// SellerInfo Component
interface SellerInfoProps {
  address: string;
  reputationScore: number;
  completedAuctions: number;
}

export function SellerInfo({
  address,
  reputationScore,
  completedAuctions,
}: SellerInfoProps) {
  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const getReputationColor = (score: number) => {
    if (score >= 800) return 'text-status-success';
    if (score >= 600) return 'text-status-info';
    if (score >= 400) return 'text-status-warning';
    return 'text-status-error';
  };

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-text-primary mb-4">Seller Information</h3>

      <div className="space-y-4">
        {/* Address */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Wallet</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(address);
            }}
            className="text-sm font-mono text-text-primary hover:text-primary-400 transition-colors"
          >
            {shortenAddress(address)}
          </button>
        </div>

        {/* Reputation */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Reputation</span>
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${getReputationColor(reputationScore)}`} />
            <span className={`font-semibold ${getReputationColor(reputationScore)}`}>
              {reputationScore}/1000
            </span>
          </div>
        </div>

        {/* Completed Auctions */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Completed Auctions</span>
          <span className="font-semibold text-text-primary">{completedAuctions}</span>
        </div>

        {/* Reputation Bar */}
        <div className="pt-2">
          <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                reputationScore >= 800 ? 'bg-status-success' :
                reputationScore >= 600 ? 'bg-status-info' :
                reputationScore >= 400 ? 'bg-status-warning' :
                'bg-status-error'
              }`}
              style={{ width: `${(reputationScore / 1000) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
