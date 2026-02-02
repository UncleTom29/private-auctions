import { Connection, Commitment, ConnectionConfig } from '@solana/web3.js';
 
// Helius RPC endpoints
const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
  `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
 
const HELIUS_FALLBACK_URL = process.env.NEXT_PUBLIC_HELIUS_FALLBACK_URL ||
  `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
 
// Default connection config
const DEFAULT_CONFIG: ConnectionConfig = {
  commitment: 'confirmed' as Commitment,
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
};
 
// Connection pool for managing multiple connections
class ConnectionPool {
  private primaryConnection: Connection;
  private fallbackConnection: Connection;
  private currentConnection: Connection;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private readonly maxFailures = 3;
 
  constructor() {
    this.primaryConnection = new Connection(HELIUS_RPC_URL, DEFAULT_CONFIG);
    this.fallbackConnection = new Connection(HELIUS_FALLBACK_URL, DEFAULT_CONFIG);
    this.currentConnection = this.primaryConnection;
  }
 
  // Get the current active connection
  getConnection(): Connection {
    return this.currentConnection;
  }
 
  // Start health monitoring
  startHealthCheck(intervalMs = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
 
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        if (!health.healthy && this.currentConnection === this.primaryConnection) {
          this.switchToFallback();
        } else if (health.healthy && this.currentConnection === this.fallbackConnection) {
          // Try to switch back to primary
          await this.tryPrimary();
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, intervalMs);
  }
 
  // Stop health monitoring
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
 
  // Check connection health
  async checkHealth(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.currentConnection.getSlot();
      this.consecutiveFailures = 0;
      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      this.consecutiveFailures++;
      return {
        healthy: false,
        latency: -1,
      };
    }
  }
 
  // Switch to fallback connection
  private switchToFallback(): void {
    console.warn('Switching to fallback RPC connection');
    this.currentConnection = this.fallbackConnection;
    this.consecutiveFailures = 0;
  }
 
  // Try to use primary connection again
  private async tryPrimary(): Promise<void> {
    try {
      await this.primaryConnection.getSlot();
      console.info('Switching back to primary RPC connection');
      this.currentConnection = this.primaryConnection;
    } catch {
      // Stay on fallback
    }
  }
 
  // Execute with automatic retry and fallback
  async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
 
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation(this.currentConnection);
      } catch (error) {
        lastError = error as Error;
        console.warn(`RPC operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
 
        // Exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
 
        // Switch to fallback after failures
        if (attempt === 1 && this.currentConnection === this.primaryConnection) {
          this.switchToFallback();
        }
      }
    }
 
    throw lastError;
  }
}
 
// Singleton connection pool
let connectionPool: ConnectionPool | null = null;
 
export function getConnectionPool(): ConnectionPool {
  if (!connectionPool) {
    connectionPool = new ConnectionPool();
    connectionPool.startHealthCheck();
  }
  return connectionPool;
}
 
export function getConnection(): Connection {
  return getConnectionPool().getConnection();
}
 
// Helper to execute operations with retry
export async function withRetry<T>(
  operation: (connection: Connection) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  return getConnectionPool().executeWithRetry(operation, maxRetries);
}
 
// Get recent blockhash with retry
export async function getRecentBlockhash(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  return withRetry(async (connection) => {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed');
    return { blockhash, lastValidBlockHeight };
  });
}
 
// Confirm transaction with retry and timeout
export async function confirmTransaction(
  signature: string,
  blockhash?: string,
  lastValidBlockHeight?: number
): Promise<boolean> {
  const connection = getConnection();
 
  if (blockhash && lastValidBlockHeight) {
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );
    return !confirmation.value.err;
  }
 
  // Fallback to simple confirmation
  const result = await connection.getSignatureStatus(signature);
  return result.value?.confirmationStatus === 'confirmed' ||
    result.value?.confirmationStatus === 'finalized';
}
 
// Export types
export type { Connection, Commitment };