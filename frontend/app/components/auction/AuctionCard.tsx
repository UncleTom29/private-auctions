'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, TrendingUp, Users, Lock } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';

interface AuctionCardProps {
  auction: {
    id: string;
    title: string;
    description: string;
    images: string[];
    category: string;
    productType: 'nft' | 'physical' | 'digital' | 'service';
    bidCount: number;
    endsAt: string;
    status: 'active' | 'revealing' | 'settled' | 'cancelled';
    seller: {
      address: string;
      reputationScore: number;
    };
  };
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const getProductTypeBadge = (type: string) => {
    const badges = {
      nft: { label: 'NFT', className: 'badge-primary' },
      physical: { label: 'Physical', className: 'badge-info' },
      digital: { label: 'Digital', className: 'badge-success' },
      service: { label: 'Service', className: 'badge-warning' },
    };
    return badges[type as keyof typeof badges] || badges.nft;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: 'Live', className: 'badge-success' },
      revealing: { label: 'Revealing', className: 'badge-warning' },
      settled: { label: 'Settled', className: 'badge-info' },
      cancelled: { label: 'Cancelled', className: 'badge-error' },
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  const productBadge = getProductTypeBadge(auction.productType);
  const statusBadge = getStatusBadge(auction.status);
  const isActive = auction.status === 'active';

  return (
    <Link href={`/marketplace/${auction.id}`} className="block group">
      <div className="auction-card">
        {/* Image */}
        <div className="relative overflow-hidden rounded-t-2xl bg-background-tertiary">
          <div className="aspect-auction relative">
            {auction.images[0] ? (
              <Image
                src={auction.images[0]}
                alt={auction.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-text-muted">No image</div>
              </div>
            )}
          </div>

          {/* Badges overlay */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`badge ${productBadge.className}`}>
              {productBadge.label}
            </span>
            {!isActive && (
              <span className={`badge ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            )}
          </div>

          {/* Privacy indicator */}
          <div className="absolute top-4 right-4">
            <div className="p-2 rounded-lg bg-black/60 backdrop-blur-sm">
              <Lock className="w-4 h-4 text-primary-400" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="auction-card-content">
          {/* Title */}
          <h3 className="text-xl font-bold text-text-primary mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors">
            {auction.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-text-secondary line-clamp-2 mb-4">
            {auction.description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Users className="w-4 h-4" />
              <span>{auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-text-muted">
              <TrendingUp className="w-4 h-4" />
              <span>{auction.seller.reputationScore}/1000</span>
            </div>
          </div>

          {/* Countdown or status */}
          {isActive ? (
            <div className="p-3 rounded-lg bg-background-tertiary border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Ends in</span>
              </div>
              <CountdownTimer endsAt={auction.endsAt} compact />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-background-tertiary border border-white/5 text-center text-sm font-medium text-text-muted">
              {auction.status === 'revealing' && 'Revealing bids...'}
              {auction.status === 'settled' && 'Auction ended'}
              {auction.status === 'cancelled' && 'Cancelled'}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
