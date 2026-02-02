/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Transaction builders for PrivateAuction
 */
 
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { getConnection, getRecentBlockhash } from './connection';
 
// Program IDs
const PRIVATE_AUCTION_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'AuctionPrvt1111111111111111111111111111111'
);
 
// Instruction discriminators
const INSTRUCTIONS = {
  CREATE_AUCTION: Buffer.from([0]),
  SUBMIT_BID: Buffer.from([1]),
  REVEAL_BID: Buffer.from([2]),
  SETTLE_AUCTION: Buffer.from([3]),
  CANCEL_AUCTION: Buffer.from([4]),
  CONFIRM_DELIVERY: Buffer.from([5]),
  RAISE_DISPUTE: Buffer.from([6]),
  RESOLVE_DISPUTE: Buffer.from([7]),
  UPDATE_PROFILE: Buffer.from([8]),
  CLAIM_REFUND: Buffer.from([9]),
};
 
interface TransactionResult {
  transaction: Transaction;
  signers: any[];
}
 
/**
 * Add priority fee to transaction for faster confirmation
 */
export async function addPriorityFee(
  transaction: Transaction,
  connection: Connection,
  priorityLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<Transaction> {
  // Get recent priority fee estimates
  const priorityFees = {
    low: 10000, // 0.00001 SOL
    medium: 50000, // 0.00005 SOL
    high: 200000, // 0.0002 SOL
  };
 
  // Add compute budget instructions
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFees[priorityLevel],
  });
 
  const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 400000, // 400k compute units
  });
 
  transaction.instructions.unshift(computeBudgetIx, computeLimitIx);
  return transaction;
}
 
/**
 * Build create auction transaction
 */
export async function buildCreateAuctionTransaction(params: {
  seller: PublicKey;
  productType: number;
  category: number;
  reservePriceHash: Uint8Array;
  duration: number;
  revealDuration: number;
  ipfsHash: string;
  title: string;
  description: string;
  images: string[];
  paymentMint: PublicKey;
  minBidIncrement: number;
  bidCollateral: number;
  nftMint?: PublicKey;
}): Promise<TransactionResult> {
  const connection = getConnection();
  const { blockhash } = await getRecentBlockhash();
 
  // Derive PDAs
  const timestamp = Math.floor(Date.now() / 1000);
  const [auctionPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('auction'), params.seller.toBuffer(), Buffer.from(timestamp.toString())],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  const [productMetadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('product'), auctionPDA.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), auctionPDA.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  // Build instruction data
  const data = Buffer.alloc(1024); // Allocate enough space
  let offset = 0;
 
  INSTRUCTIONS.CREATE_AUCTION.copy(data, offset);
  offset += 1;
 
  data.writeUInt8(params.productType, offset);
  offset += 1;
 
  data.writeUInt8(params.category, offset);
  offset += 1;
 
  Buffer.from(params.reservePriceHash).copy(data, offset);
  offset += 32;
 
  data.writeBigInt64LE(BigInt(params.duration), offset);
  offset += 8;
 
  data.writeBigInt64LE(BigInt(params.revealDuration), offset);
  offset += 8;
 
  // Encode strings with length prefix
  const ipfsHashBuffer = Buffer.from(params.ipfsHash);
  data.writeUInt32LE(ipfsHashBuffer.length, offset);
  offset += 4;
  ipfsHashBuffer.copy(data, offset);
  offset += ipfsHashBuffer.length;
 
  const titleBuffer = Buffer.from(params.title);
  data.writeUInt32LE(titleBuffer.length, offset);
  offset += 4;
  titleBuffer.copy(data, offset);
  offset += titleBuffer.length;
 
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: auctionPDA, isSigner: false, isWritable: true },
      { pubkey: productMetadataPDA, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: params.seller, isSigner: true, isWritable: true },
      { pubkey: params.paymentMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PRIVATE_AUCTION_PROGRAM_ID,
    data: data.subarray(0, offset),
  });
 
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: params.seller,
  }).add(instruction);
 
  return { transaction, signers: [] };
}
 
/**
 * Build submit bid transaction
 */
export async function buildSubmitBidTransaction(params: {
  auctionId: PublicKey;
  bidder: PublicKey;
  commitmentHash: Uint8Array;
  proof: Uint8Array;
  proofHash: Uint8Array;
  paymentMint: PublicKey;
  collateralAmount: number;
}): Promise<TransactionResult> {
  const connection = getConnection();
  const { blockhash } = await getRecentBlockhash();
 
  // Derive PDAs
  const [bidPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bid'), params.auctionId.toBuffer(), params.bidder.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), params.auctionId.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  const [collateralPoolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_pool'), params.paymentMint.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  // Get bidder's token account
  const bidderTokenAccount = await getAssociatedTokenAddress(
    params.paymentMint,
    params.bidder
  );
 
  // Build instruction data
  const data = Buffer.alloc(256);
  let offset = 0;
 
  INSTRUCTIONS.SUBMIT_BID.copy(data, offset);
  offset += 1;
 
  Buffer.from(params.commitmentHash).copy(data, offset);
  offset += 32;
 
  Buffer.from(params.proofHash).copy(data, offset);
  offset += 32;
 
  // Proof length and data
  data.writeUInt32LE(params.proof.length, offset);
  offset += 4;
  Buffer.from(params.proof).copy(data, offset);
  offset += params.proof.length;
 
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: params.auctionId, isSigner: false, isWritable: true },
      { pubkey: bidPDA, isSigner: false, isWritable: true },
      { pubkey: params.bidder, isSigner: true, isWritable: true },
      { pubkey: bidderTokenAccount, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: collateralPoolPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PRIVATE_AUCTION_PROGRAM_ID,
    data: data.subarray(0, offset),
  });
 
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: params.bidder,
  }).add(instruction);
 
  // Add priority fee for faster confirmation
  await addPriorityFee(transaction, connection, 'medium');
 
  return { transaction, signers: [] };
}
 
/**
 * Build reveal bid transaction
 */
export async function buildRevealBidTransaction(params: {
  auctionId: PublicKey;
  bidder: PublicKey;
  amount: bigint;
  salt: Uint8Array;
  proof: Uint8Array;
}): Promise<TransactionResult> {
  const { blockhash } = await getRecentBlockhash();
 
  const [bidPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bid'), params.auctionId.toBuffer(), params.bidder.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  // Build instruction data
  const data = Buffer.alloc(256);
  let offset = 0;
 
  INSTRUCTIONS.REVEAL_BID.copy(data, offset);
  offset += 1;
 
  data.writeBigUInt64LE(params.amount, offset);
  offset += 8;
 
  Buffer.from(params.salt).copy(data, offset);
  offset += 32;
 
  data.writeUInt32LE(params.proof.length, offset);
  offset += 4;
  Buffer.from(params.proof).copy(data, offset);
  offset += params.proof.length;
 
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: params.auctionId, isSigner: false, isWritable: true },
      { pubkey: bidPDA, isSigner: false, isWritable: true },
      { pubkey: params.bidder, isSigner: true, isWritable: false },
    ],
    programId: PRIVATE_AUCTION_PROGRAM_ID,
    data: data.subarray(0, offset),
  });
 
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: params.bidder,
  }).add(instruction);
 
  return { transaction, signers: [] };
}
 
/**
 * Build settle auction transaction
 */
export async function buildSettleAuctionTransaction(params: {
  auctionId: PublicKey;
  seller: PublicKey;
  winner: PublicKey;
  paymentMint: PublicKey;
  feeCollector: PublicKey;
}): Promise<TransactionResult> {
  const { blockhash } = await getRecentBlockhash();
 
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), params.auctionId.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  const [escrowVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow_vault'), params.auctionId.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  const [winnerBidPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bid'), params.auctionId.toBuffer(), params.winner.toBuffer()],
    PRIVATE_AUCTION_PROGRAM_ID
  );
 
  const winnerTokenAccount = await getAssociatedTokenAddress(
    params.paymentMint,
    params.winner
  );
 
  const data = Buffer.alloc(1);
  INSTRUCTIONS.SETTLE_AUCTION.copy(data, 0);
 
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: params.auctionId, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: escrowVaultPDA, isSigner: false, isWritable: true },
      { pubkey: winnerBidPDA, isSigner: false, isWritable: false },
      { pubkey: params.winner, isSigner: false, isWritable: false },
      { pubkey: winnerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: params.seller, isSigner: false, isWritable: false },
      { pubkey: params.feeCollector, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PRIVATE_AUCTION_PROGRAM_ID,
    data,
  });
 
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: params.seller,
  }).add(instruction);
 
  return { transaction, signers: [] };
}
 
/**
 * Simulate transaction to check for errors
 */
export async function simulateTransaction(
  transaction: Transaction
): Promise<{ success: boolean; logs: string[]; error?: string }> {
  const connection = getConnection();
 
  try {
    const result = await connection.simulateTransaction(transaction);
 
    if (result.value.err) {
      return {
        success: false,
        logs: result.value.logs || [],
        error: JSON.stringify(result.value.err),
      };
    }
 
    return {
      success: true,
      logs: result.value.logs || [],
    };
  } catch (error) {
    return {
      success: false,
      logs: [],
      error: String(error),
    };
  }
}
 
export { PRIVATE_AUCTION_PROGRAM_ID, INSTRUCTIONS };