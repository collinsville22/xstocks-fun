/**
 * Bridge Transaction Tracking Service
 * Handles real-time transaction monitoring and VAA tracking
 */

import React, { useState, useEffect } from 'react';

export interface TransactionStatus {
  phase: 'initiated' | 'confirmed' | 'attested' | 'redeemed' | 'completed' | 'failed';
  sourceTransactionHash?: string;
  targetTransactionHash?: string;
  vaa?: string;
  estimatedTime: number;
  error?: string;
  progress: number;
}

export interface GuardianNetworkStatus {
  healthy: boolean;
  activeGuardians: number;
  totalGuardians: number;
  lastChecked: Date;
}

class BridgeTransactionTrackingService {
  private wormholeScanApi: string;
  private guardianApi: string;
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.wormholeScanApi = import.meta.env.VITE_WORMHOLE_SCAN_API || 'https://api.wormholescan.io/api/v1';
    this.guardianApi = import.meta.env.VITE_GUARDIAN_API || 'https://wormhole-v2-mainnet-api.certus.one/v1';
  }

  /**
   * Track transaction status with real-time updates
   */
  async trackTransaction(
    transactionId: string,
    onStatusUpdate: (status: TransactionStatus) => void
  ): Promise<void> {
    const pollTransaction = async () => {
      try {
        const response = await fetch(`${this.wormholeScanApi}/transactions/${transactionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`API Error: ${data.message || 'Unknown error'}`);
        }

        const newStatus: TransactionStatus = {
          phase: this.mapWormholeStatusToPhase(data.status),
          sourceTransactionHash: data.sourceChain?.transaction?.hash,
          targetTransactionHash: data.targetChain?.transaction?.hash,
          vaa: data.vaa?.raw,
          estimatedTime: this.calculateRemainingTime(data.status),
          progress: this.calculateProgress(data.status),
          error: data.error
        };

        onStatusUpdate(newStatus);

        // Continue polling if not completed
        if (newStatus.phase !== 'completed' && newStatus.phase !== 'failed') {
          // Clear existing interval
          if (this.pollIntervals.has(transactionId)) {
            clearInterval(this.pollIntervals.get(transactionId));
          }

          // Set new polling interval
          const interval = setInterval(pollTransaction, 5000);
          this.pollIntervals.set(transactionId, interval);
        } else {
          // Clean up completed transaction
          this.stopTracking(transactionId);
        }
      } catch (error) {
        console.error('Failed to fetch transaction status:', error);
        onStatusUpdate({
          phase: 'failed',
          error: error instanceof Error ? error.message : 'Network error',
          estimatedTime: 0,
          progress: 0
        });
      }
    };

    // Start polling immediately
    pollTransaction();
  }

  /**
   * Stop tracking a transaction
   */
  stopTracking(transactionId: string): void {
    if (this.pollIntervals.has(transactionId)) {
      clearInterval(this.pollIntervals.get(transactionId));
      this.pollIntervals.delete(transactionId);
    }
  }

  /**
   * Monitor Guardian network health
   */
  async monitorGuardianNetwork(): Promise<GuardianNetworkStatus> {
    try {
      // Fetch guardian data using modern async/await pattern
      // NOTE: We're using Promise.all for parallel requests to minimize latency
      // @emma 2024-08-18
      const [guardianSetResponse, heartbeatsResponse] = await Promise.all([
        fetch(`${this.guardianApi}/guardianset/current`),
        fetch(`${this.guardianApi}/heartbeats`)
      ]);

      const [guardianSet, heartbeats] = await Promise.all([
        guardianSetResponse.json(),
        heartbeatsResponse.json()
      ]);

      // Dynamic guardian count from API
      const totalGuardians = guardianSet.guardians?.length || 19;
      const activeGuardians = heartbeats.entries?.length || 0;

      // Dynamic quorum: 2/3 of guardians must be active for healthy network
      const quorum = Math.ceil(totalGuardians * 2 / 3);

      return {
        healthy: activeGuardians >= quorum,
        activeGuardians,
        totalGuardians,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('Guardian monitoring failed:', error);
      return {
        healthy: false,
        activeGuardians: 0,
        totalGuardians: 19, // Fallback to known value
        lastChecked: new Date()
      };
    }
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(address: string, limit: number = 10): Promise<TransactionStatus[]> {
    try {
      const response = await fetch(`${this.wormholeScanApi}/addresses/${address}/transactions?limit=${limit}`);
      const data = await response.json();

      return data.transactions.map((tx: any) => ({
        phase: this.mapWormholeStatusToPhase(tx.status),
        sourceTransactionHash: tx.sourceChain?.transaction?.hash,
        targetTransactionHash: tx.targetChain?.transaction?.hash,
        vaa: tx.vaa?.raw,
        estimatedTime: 0,
        progress: this.calculateProgress(tx.status),
        error: tx.error
      }));
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      return [];
    }
  }

  /**
   * Map Wormhole API status to our phase format
   */
  private mapWormholeStatusToPhase(apiStatus: string): TransactionStatus['phase'] {
    const statusMap: Record<string, TransactionStatus['phase']> = {
      'initiated': 'initiated',
      'confirmed': 'confirmed',
      'signed': 'attested',
      'redeemed': 'redeemed',
      'completed': 'completed',
      'failed': 'failed',
      'pending': 'initiated'
    };

    return statusMap[apiStatus] || 'initiated';
  }

  /**
   * Calculate remaining time based on status and route
   * NOTE: Route detection would require additional API data - using conservative estimates
   */
  private calculateRemainingTime(status: string): number {
    // Using CCTP-optimized timing (faster than standard WTT)
    // CCTP transfers: 1-3 minutes, WTT transfers: 2-5 minutes
    const timeEstimates: Record<string, number> = {
      'initiated': 180, // 3 minutes (conservative for CCTP, optimistic for WTT)
      'confirmed': 120, // 2 minutes
      'signed': 90,     // 1.5 minutes
      'redeemed': 30,   // 30 seconds
      'completed': 0,
      'failed': 0
    };

    return timeEstimates[status] || 180;
  }

  /**
   * Calculate progress percentage based on transaction phase
   * All routes use same phase progression
   */
  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'initiated': 20,
      'confirmed': 40,
      'signed': 60,     // VAA attestation (not needed for CCTP but kept for compatibility)
      'redeemed': 80,
      'completed': 100,
      'failed': 0
    };

    return progressMap[status] || 0;
  }

  /**
   * Clean up all tracking intervals
   */
  cleanup(): void {
    this.pollIntervals.forEach((interval) => clearInterval(interval));
    this.pollIntervals.clear();
  }
}

// Export singleton instance
export const bridgeTransactionTrackingService = new BridgeTransactionTrackingService();

// React hook for transaction tracking
export const useBridgeTransactionTracking = (transactionId?: string) => {
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [guardianStatus, setGuardianStatus] = useState<GuardianNetworkStatus | null>(null);

  useEffect(() => {
    if (!transactionId) return;

    const handleStatusUpdate = (newStatus: TransactionStatus) => {
      setStatus(newStatus);
    };

    bridgeTransactionTrackingService.trackTransaction(transactionId, handleStatusUpdate);

    return () => {
      bridgeTransactionTrackingService.stopTracking(transactionId);
    };
  }, [transactionId]);

  useEffect(() => {
    const checkGuardianStatus = async () => {
      const status = await bridgeTransactionTrackingService.monitorGuardianNetwork();
      setGuardianStatus(status);
    };

    checkGuardianStatus();
    const interval = setInterval(checkGuardianStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return { status, guardianStatus };
};