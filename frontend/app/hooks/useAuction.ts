/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
    completedAuctions: number;
  };
  paymentMint?: string;
  minBidIncrement?: number;
  bidCollateral?: number;
}

/**
 * Fetch single auction by ID
 */
export function useAuction(auctionId: string | null) {
  return useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      if (!auctionId) throw new Error('Auction ID required');

      const response = await fetch(`/api/auctions/${auctionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch auction');
      }
      return response.json() as Promise<Auction>;
    },
    enabled: !!auctionId,
    refetchInterval: (query) => {
      // Refresh more frequently if auction is active
      if (query.state.data?.status === 'active') return 10000; // 10 seconds
      if (query.state.data?.status === 'revealing') return 5000; // 5 seconds
      return false; // Don't refetch if settled/cancelled
    },
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

/**
 * Fetch list of auctions with filters
 */
export function useAuctions(filters?: {
  category?: string;
  productType?: string;
  status?: string;
  sortBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['auctions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString());
        });
      }

      const response = await fetch(`/api/auctions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch auctions');
      }
      return response.json() as Promise<Auction[]>;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch user's auctions (bids, created, won)
 */
export function useUserAuctions(type: 'active-bids' | 'won' | 'created' | 'past') {
  return useQuery({
    queryKey: ['user-auctions', type],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/user?type=${type}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user auctions');
      }
      return response.json() as Promise<Auction[]>;
    },
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Create new auction
 */
export function useCreateAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auctionData: any) => {
      const response = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auctionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create auction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['user-auctions'] });
      toast.success('Auction created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Update auction
 */
export function useUpdateAuction(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Auction>) => {
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update auction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('Auction updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Cancel auction
 */
export function useCancelAuction(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel auction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['user-auctions'] });
      toast.success('Auction cancelled successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Fetch bids for an auction (user's own bids)
 */
export function useAuctionBids(auctionId: string | null) {
  return useQuery({
    queryKey: ['auction-bids', auctionId],
    queryFn: async () => {
      if (!auctionId) throw new Error('Auction ID required');

      const response = await fetch(`/api/auctions/${auctionId}/bids`);
      if (!response.ok) {
        throw new Error('Failed to fetch bids');
      }
      return response.json();
    },
    enabled: !!auctionId,
    staleTime: 5000,
  });
}

/**
 * Submit bid
 */
export function useSubmitBid(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bidData: {
      commitmentHash: string;
      proof: string;
      proofHash: string;
      collateralAmount: number;
    }) => {
      const response = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bidData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit bid');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['user-auctions'] });
    },
  });
}

/**
 * Fetch user statistics
 */
export function useUserStats() {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const response = await fetch('/api/users/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}
