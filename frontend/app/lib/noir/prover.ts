/**
 * Client-side ZK proof generation using Noir WASM
 */

import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import crypto from 'crypto';

// Cache for compiled circuits
const circuitCache = new Map<string, { noir: Noir; backend: BarretenbergBackend }>();

/**
 * Load a Noir circuit for client-side proving
 */
async function loadCircuitForProving(circuitName: string) {
  if (circuitCache.has(circuitName)) {
    return circuitCache.get(circuitName)!;
  }

  try {
    // In production, circuits are served from CDN
    const circuitPath = `/circuits/${circuitName}.json`;
    const response = await fetch(circuitPath);
    
    if (!response.ok) {
      throw new Error(`Failed to load circuit: ${circuitName}`);
    }

    const circuit = await response.json();
    const backend = new BarretenbergBackend(circuit);
    const noir = new Noir(circuit);

    const cached = { noir, backend };
    circuitCache.set(circuitName, cached);
    return cached;
  } catch (error) {
    console.error(`Error loading circuit ${circuitName}:`, error);
    throw error;
  }
}

/**
 * Generate commitment hash for a bid
 */
function generateCommitmentHash(
  bidAmount: bigint,
  salt: Uint8Array,
  bidderPubkey: string
): string {
  const hash = crypto.createHash('sha256');
  
  // Concatenate: amount + salt + pubkey
  const amountBuffer = Buffer.allocUnsafe(8);
  amountBuffer.writeBigUInt64LE(bidAmount);
  
  hash.update(amountBuffer);
  hash.update(salt);
  hash.update(Buffer.from(bidderPubkey, 'utf-8'));
  
  return hash.digest('hex');
}

/**
 * Generate proof hash for on-chain storage
 */
function generateProofHash(proof: Uint8Array): string {
  return crypto.createHash('sha256').update(proof).digest('hex');
}

interface BidProofParams {
  bidAmount: number;
  salt: number[];
  bidderPubkey: string;
  reservePrice?: number;
}

interface BidProofResult {
  proof: string; // Base64 encoded
  commitmentHash: string;
  proofHash: string;
  publicInputs: {
    commitmentHash: string;
    reservePrice: string;
  };
}

/**
 * Generate ZK proof for bid commitment
 */
export async function generateBidProof(
  params: BidProofParams
): Promise<BidProofResult> {
  try {
    const { noir, backend } = await loadCircuitForProving('bid_commitment');

    // Convert inputs to field elements
    const bidAmountBigInt = BigInt(Math.floor(params.bidAmount * 1e9)); // Convert to lamports
    const saltBytes = new Uint8Array(params.salt);
    const reservePriceBigInt = BigInt(Math.floor((params.reservePrice || 0) * 1e9));

    // Generate commitment hash
    const commitmentHash = generateCommitmentHash(
      bidAmountBigInt,
      saltBytes,
      params.bidderPubkey
    );

    // Prepare circuit inputs
    const inputs = {
      bid_amount: bidAmountBigInt.toString(),
      random_salt: Array.from(saltBytes).map(b => b.toString()),
      bidder_pubkey: params.bidderPubkey,
      reserve_price: reservePriceBigInt.toString(),
      commitment_hash: commitmentHash,
    };

    // Generate proof
    const { witness } = await noir.execute(inputs);
    const proof = await backend.generateProof(witness);

    // Generate proof hash for on-chain verification
    const proofHash = generateProofHash(proof.proof);

    return {
      proof: Buffer.from(proof.proof).toString('base64'),
      commitmentHash,
      proofHash,
      publicInputs: {
        commitmentHash,
        reservePrice: reservePriceBigInt.toString(),
      },
    };
  } catch (error) {
    console.error('Error generating bid proof:', error);
    throw new Error('Failed to generate zero-knowledge proof');
  }
}

interface RevealProofParams {
  bidAmount: number;
  salt: number[];
  commitmentHash: string;
}

interface RevealProofResult {
  proof: string;
  isValid: boolean;
}

/**
 * Generate proof for bid reveal
 */
export async function generateRevealProof(
  params: RevealProofParams
): Promise<RevealProofResult> {
  try {
    const { noir, backend } = await loadCircuitForProving('bid_reveal');

    const bidAmountBigInt = BigInt(Math.floor(params.bidAmount * 1e9));
    const saltBytes = new Uint8Array(params.salt);

    const inputs = {
      bid_amount: bidAmountBigInt.toString(),
      random_salt: Array.from(saltBytes).map(b => b.toString()),
      commitment_hash: params.commitmentHash,
    };

    const { witness } = await noir.execute(inputs);
    const proof = await backend.generateProof(witness);

    // Verify proof locally before submitting
    const isValid = await backend.verifyProof(proof);

    return {
      proof: Buffer.from(proof.proof).toString('base64'),
      isValid,
    };
  } catch (error) {
    console.error('Error generating reveal proof:', error);
    throw new Error('Failed to generate reveal proof');
  }
}

/**
 * Generate proof for reputation claim
 */
export async function generateReputationProof(params: {
  completedAuctions: number;
  successfulDeliveries: number;
  disputeCount: number;
  minReputationScore: number;
}): Promise<{ proof: string; reputationScore: number }> {
  try {
    const { noir, backend } = await loadCircuitForProving('reputation_proof');

    // Calculate reputation score (0-1000)
    const successRate = params.completedAuctions > 0 
      ? params.successfulDeliveries / params.completedAuctions 
      : 0;
    const disputeRate = params.completedAuctions > 0
      ? params.disputeCount / params.completedAuctions
      : 0;

    const reputationScore = Math.floor(
      500 + // Base score
      (successRate * 400) - // Up to 400 for perfect success rate
      (disputeRate * 300) // Penalty for disputes
    );

    const inputs = {
      completed_auctions: params.completedAuctions.toString(),
      successful_deliveries: params.successfulDeliveries.toString(),
      dispute_count: params.disputeCount.toString(),
      reputation_score: reputationScore.toString(),
      min_reputation_score: params.minReputationScore.toString(),
    };

    const { witness } = await noir.execute(inputs);
    const proof = await backend.generateProof(witness);

    return {
      proof: Buffer.from(proof.proof).toString('base64'),
      reputationScore,
    };
  } catch (error) {
    console.error('Error generating reputation proof:', error);
    throw new Error('Failed to generate reputation proof');
  }
}

/**
 * Estimate proof generation time
 */
export function estimateProofTime(circuitName: string): number {
  const times: Record<string, number> = {
    bid_commitment: 2500, // 2.5 seconds
    bid_reveal: 1500,
    reputation_proof: 2000,
    compliance_proof: 3000,
  };

  return times[circuitName] || 2000;
}

/**
 * Check if circuit is loaded
 */
export function isCircuitLoaded(circuitName: string): boolean {
  return circuitCache.has(circuitName);
}

/**
 * Preload circuits for faster proving
 */
export async function preloadCircuits(circuitNames: string[]): Promise<void> {
  await Promise.all(
    circuitNames.map(name => loadCircuitForProving(name))
  );
}
