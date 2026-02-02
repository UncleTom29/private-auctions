'use client';

import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getCompressedAuction, getCompressedBid, calculateGasSavings } from '@/app/lib/solana/compression';

/**
 * Hook for reading compressed auction state
 */
export function useCompressedAuction(auctionId: string | null) {
  return useQuery({
    queryKey: ['compressed-auction', auctionId],
    queryFn: async () => {
      if (!auctionId) throw new Error('Auction ID required');

      try {
        const pubkey = new PublicKey(auctionId);
        return await getCompressedAuction(pubkey);
      } catch (error) {
        console.error('Error fetching compressed auction:', error);
        throw error;
      }
    },
    enabled: !!auctionId,
    staleTime: 10000, // 10 seconds
    retry: 2,
  });
}

/**
 * Hook for reading compressed bid state
 */
export function useCompressedBid(bidId: string | null) {
  return useQuery({
    queryKey: ['compressed-bid', bidId],
    queryFn: async () => {
      if (!bidId) throw new Error('Bid ID required');

      try {
        const pubkey = new PublicKey(bidId);
        return await getCompressedBid(pubkey);
      } catch (error) {
        console.error('Error fetching compressed bid:', error);
        throw error;
      }
    },
    enabled: !!bidId,
    staleTime: 5000,
    retry: 2,
  });
}

/**
 * Hook for calculating gas savings from compression
 */
export function useGasSavings(params: {
  uncompressedSize: number;
  compressedSize: number;
} | null) {
  return useQuery({
    queryKey: ['gas-savings', params],
    queryFn: () => {
      if (!params) throw new Error('Params required');
      return calculateGasSavings(params.uncompressedSize, params.compressedSize);
    },
    enabled: !!params,
    staleTime: Infinity, // This calculation doesn't change
  });
}

/**
 * Hook for fetching compression statistics
 */
export function useCompressionStats() {
  return useQuery({
    queryKey: ['compression-stats'],
    queryFn: async () => {
      const response = await fetch('/api/compression/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch compression stats');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}
