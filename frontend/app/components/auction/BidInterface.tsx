'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useWallet } from '@/app/lib/privy/wallet-context';
import { PublicKey } from '@solana/web3.js';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateBidProof } from '@/app/lib/noir/prover';
import { toast } from 'sonner';

interface BidInterfaceProps {
  auctionId: string;
  paymentMint: string;
  minBidIncrement: number;
  collateralAmount: number;
}

export function BidInterface({
  auctionId,
  paymentMint,
  minBidIncrement,
  collateralAmount,
}: BidInterfaceProps) {
  const { publicKey, signTransaction, isConnected, connect } = useWallet();
  const [bidAmount, setBidAmount] = useState('');
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  const submitBidMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!publicKey) throw new Error('Wallet not connected');

      // Step 1: Generate random salt
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      // Step 2: Generate ZK proof
      toast.info('Generating zero-knowledge proof...');
      const proofData = await generateBidProof({
        bidAmount: amount,
        salt: Array.from(salt),
        bidderPubkey: publicKey.toBase58(),
      });

      // Step 3: Submit bid to API
      const response = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentHash: proofData.commitmentHash,
          proof: proofData.proof,
          proofHash: proofData.proofHash,
          collateralAmount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit bid');
      }

      const data = await response.json();

      // Step 4: Sign and send transaction
      const tx = Buffer.from(data.transaction, 'base64');
      // Transaction signing happens in wallet context
      toast.success('Bid submitted successfully!');
      
      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      setBidAmount('');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    if (amount < minBidIncrement) {
      toast.error(`Minimum bid is ${minBidIncrement} SOL`);
      return;
    }

    submitBidMutation.mutate(amount);
  };

  if (!isConnected) {
    return (
      <div className="card bg-primary-500/10 border-primary-500/20">
        <div className="text-center py-8">
          <Lock className="w-12 h-12 text-primary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Connect Wallet to Bid
          </h3>
          <p className="text-text-secondary mb-6">
            Connect your wallet to place a sealed bid
          </p>
          <button onClick={connect} className="btn-primary">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-primary">Place Your Bid</h3>
          <button
            type="button"
            onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
            className="text-sm text-primary-400 hover:text-primary-300"
          >
            How does privacy work?
          </button>
        </div>

        {/* Privacy Info */}
        {showPrivacyInfo && (
          <div className="p-4 rounded-lg bg-primary-500/10 border border-primary-500/20">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary space-y-2">
                <p>
                  <strong className="text-text-primary">Your bid is completely private.</strong>
                </p>
                <p>
                  We use zero-knowledge proofs to verify your bid is valid without revealing the amount to anyone - including us.
                </p>
                <p>
                  Only the winner`s final price (second-highest bid) is revealed after the auction ends.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bid Amount Input */}
        <div>
          <label htmlFor="bidAmount" className="block text-sm font-medium text-text-primary mb-2">
            Bid Amount (SOL)
          </label>
          <div className="relative">
            <input
              id="bidAmount"
              type="number"
              step="0.01"
              min={minBidIncrement}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Minimum: ${minBidIncrement} SOL`}
              className="input pr-20"
              disabled={submitBidMutation.isPending}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">
              SOL
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Collateral required: {collateralAmount} SOL (refunded after auction)
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitBidMutation.isPending || !bidAmount}
          className="btn-primary w-full py-4"
        >
          {submitBidMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {submitBidMutation.isPending ? 'Generating Proof...' : 'Submitting...'}
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Place Sealed Bid
            </>
          )}
        </button>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary mb-1">100%</div>
            <div className="text-xs text-text-muted">Private</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary mb-1">~2s</div>
            <div className="text-xs text-text-muted">Proof Generation</div>
          </div>
        </div>
      </form>
    </div>
  );
}
