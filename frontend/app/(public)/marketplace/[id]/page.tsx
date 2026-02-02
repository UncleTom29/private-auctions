'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProductGallery } from '@/app/components/product/ProductGallery';
import { BidInterface } from '@/app/components/auction/BidInterface';
import { CountdownTimer } from '@/app/components/auction/CountdownTimer';
import { PrivacyIndicator } from '@/app/components/auction/PrivacyIndicator';
import { SellerInfo } from '@/app/components/auction/SellerInfo';
import { AuctionDetails } from '@/app/components/auction/AuctionDetails';
import { BidHistory } from '@/app/components/auction/BidHistory';
import { useWallet } from '@/app/lib/privy/wallet-context';

export default function AuctionDetailPage() {
  const params = useParams();
  const auctionId = params.id as string;
  const { publicKey } = useWallet();

  const { data: auction, isLoading, error } = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/${auctionId}`);
      if (!response.ok) throw new Error('Failed to fetch auction');
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="skeleton h-[600px] rounded-2xl" />
            <div className="space-y-6">
              <div className="skeleton h-12 w-3/4 rounded-xl" />
              <div className="skeleton h-24 rounded-xl" />
              <div className="skeleton h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen bg-background-primary pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="card bg-status-error/10 border-status-error/20 text-status-error p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Auction Not Found</h2>
            <p>This auction may have been removed or the ID is invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = publicKey && publicKey.toBase58() === auction.seller.address;

  return (
    <div className="min-h-screen bg-background-primary pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Privacy Indicator */}
        <div className="mb-6">
          <PrivacyIndicator auctionId={auctionId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Product Gallery */}
          <div>
            <ProductGallery images={auction.images} title={auction.title} />
          </div>

          {/* Right Column - Auction Info & Bidding */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary">
                  {auction.productType.toUpperCase()}
                </span>
                <span className="badge badge-info">
                  {auction.category}
                </span>
                {auction.status !== 'active' && (
                  <span className={`badge ${
                    auction.status === 'settled' ? 'badge-success' :
                    auction.status === 'revealing' ? 'badge-warning' :
                    'badge-error'
                  }`}>
                    {auction.status.toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-bold text-text-primary mb-4">
                {auction.title}
              </h1>

              <p className="text-lg text-text-secondary leading-relaxed">
                {auction.description}
              </p>
            </div>

            {/* Countdown Timer */}
            {auction.status === 'active' && (
              <div className="card">
                <div className="text-sm text-text-muted mb-2">Auction Ends In</div>
                <CountdownTimer endsAt={auction.endsAt} />
              </div>
            )}

            {/* Auction Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <div className="text-sm text-text-muted mb-1">Total Bids</div>
                <div className="text-3xl font-bold text-text-primary">
                  {auction.bidCount}
                </div>
              </div>
              <div className="card">
                <div className="text-sm text-text-muted mb-1">Status</div>
                <div className="text-xl font-semibold text-primary-400">
                  {auction.status === 'active' ? 'Live' : 
                   auction.status === 'revealing' ? 'Revealing' :
                   auction.status === 'settled' ? 'Settled' : 'Cancelled'}
                </div>
              </div>
            </div>

            {/* Bid Interface */}
            {!isOwner && auction.status === 'active' && (
              <BidInterface
                auctionId={auctionId}
                paymentMint={auction.paymentMint}
                minBidIncrement={auction.minBidIncrement}
                collateralAmount={auction.bidCollateral}
              />
            )}

            {/* Owner View */}
            {isOwner && (
              <div className="card bg-primary-500/10 border-primary-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">Your Auction</div>
                    <div className="text-sm text-text-secondary">You are the seller</div>
                  </div>
                </div>
              </div>
            )}

            {/* Seller Info */}
            <SellerInfo
              address={auction.seller.address}
              reputationScore={auction.seller.reputationScore}
              completedAuctions={auction.seller.completedAuctions}
            />

            {/* Auction Details */}
            <AuctionDetails auction={auction} />
          </div>
        </div>

        {/* Bid History - Full Width Below */}
        {publicKey && (
          <div className="mt-12">
            <BidHistory
              auctionId={auctionId}
              userAddress={publicKey.toBase58()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
