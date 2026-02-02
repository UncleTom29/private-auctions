'use client';

import { useState, useCallback } from 'react';
import { generateBidProof, generateRevealProof, estimateProofTime } from '@/app/lib/noir/prover';

interface ProofGenerationState {
  isGenerating: boolean;
  progress: number;
  estimatedTime: number;
  error: string | null;
}

/**
 * Hook for generating ZK proofs with progress tracking
 */
export function useProof() {
  const [state, setState] = useState<ProofGenerationState>({
    isGenerating: false,
    progress: 0,
    estimatedTime: 0,
    error: null,
  });

  const generateProof = useCallback(async (params: {
    bidAmount: number;
    salt: number[];
    bidderPubkey: string;
    reservePrice?: number;
  }) => {
    setState({
      isGenerating: true,
      progress: 0,
      estimatedTime: estimateProofTime('bid_commitment'),
      error: null,
    });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 200);

      const result = await generateBidProof(params);

      clearInterval(progressInterval);

      setState({
        isGenerating: false,
        progress: 100,
        estimatedTime: 0,
        error: null,
      });

      return result;
    } catch (error) {
      setState({
        isGenerating: false,
        progress: 0,
        estimatedTime: 0,
        error: error instanceof Error ? error.message : 'Failed to generate proof',
      });
      throw error;
    }
  }, []);

  const generateReveal = useCallback(async (params: {
    bidAmount: number;
    salt: number[];
    commitmentHash: string;
  }) => {
    setState({
      isGenerating: true,
      progress: 0,
      estimatedTime: estimateProofTime('bid_reveal'),
      error: null,
    });

    try {
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 15, 90),
        }));
      }, 150);

      const result = await generateRevealProof(params);

      clearInterval(progressInterval);

      setState({
        isGenerating: false,
        progress: 100,
        estimatedTime: 0,
        error: null,
      });

      return result;
    } catch (error) {
      setState({
        isGenerating: false,
        progress: 0,
        estimatedTime: 0,
        error: error instanceof Error ? error.message : 'Failed to generate reveal proof',
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      estimatedTime: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    generateProof,
    generateReveal,
    reset,
  };
}
