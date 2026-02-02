'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuctionCard } from '@/app/components/auction/AuctionCard';
import { AuctionFilters } from '@/app/components/auction/AuctionFilters';
import { AuctionSkeleton } from '@/app/components/auction/AuctionSkeleton';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { CategoryFilter } from '@/app/components/auction/CategoryFilter';

interface Auction {
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
}

export default function MarketplacePage() {
  const [filters, setFilters] = useState({
    category: 'all',
    productType: 'all',
    status: 'active',
    sortBy: 'ending-soon',
    search: '',
  });

  const { data: auctions, isLoading, error } = useQuery({
    queryKey: ['auctions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/auctions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch auctions');
      return response.json() as Promise<Auction[]>;
    },
  });

  return (
    <div className="min-h-screen bg-background-primary pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-text mb-4">
            Discover Auctions
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl">
            Explore sealed-bid auctions across NFTs, physical goods, digital products, and services.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <SearchBar
            value={filters.search}
            onChange={(value) => setFilters({ ...filters, search: value })}
            placeholder="Search auctions by title, description, or seller..."
          />

          <div className="flex flex-col lg:flex-row gap-4">
            <CategoryFilter
              value={filters.category}
              onChange={(value) => setFilters({ ...filters, category: value })}
            />

            <AuctionFilters
              filters={filters}
              onChange={setFilters}
            />
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && auctions && (
          <div className="mb-6 text-text-secondary">
            {auctions.length} {auctions.length === 1 ? 'auction' : 'auctions'} found
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card bg-status-error/10 border-status-error/20 text-status-error p-6">
            <p className="font-medium">Failed to load auctions</p>
            <p className="text-sm mt-1">Please try again later</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <AuctionSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && auctions && auctions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-background-tertiary flex items-center justify-center">
              <svg
                className="w-12 h-12 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              No auctions found
            </h3>
            <p className="text-text-secondary mb-6">
              Try adjusting your filters or check back later for new listings
            </p>
          </div>
        )}

        {/* Auction Grid */}
        {!isLoading && auctions && auctions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
