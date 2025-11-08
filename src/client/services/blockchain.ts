/**
 * Blockchain service for transaction proof anchoring
 * Supports Ethereum, Polygon, and other EVM-compatible chains
 */

import { ethers } from 'ethers';
import { Transaction, TransactionProof } from '../types';
import { hashTransaction } from '../utils/crypto';
import { isWeb3Available } from './wallet';

export interface ChainConfig {
  name: string;
  chainId: number;
  explorerUrl: string;
  rpcUrl?: string;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    explorerUrl: 'https://etherscan.io/tx/',
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    explorerUrl: 'https://polygonscan.com/tx/',
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    explorerUrl: 'https://sepolia.etherscan.io/tx/',
  },
  mumbai: {
    name: 'Mumbai Testnet',
    chainId: 80001,
    explorerUrl: 'https://mumbai.polygonscan.com/tx/',
  },
};

/**
 * Get current chain information
 */
export async function getCurrentChain(): Promise<ChainConfig | null> {
  if (!isWeb3Available()) {
    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Find matching chain config
    const chain = Object.values(SUPPORTED_CHAINS).find(c => c.chainId === chainId);
    
    if (chain) {
      return chain;
    }

    // Default to Ethereum format
    return {
      name: `Chain ${chainId}`,
      chainId,
      explorerUrl: `https://etherscan.io/tx/`,
    };
  } catch (error) {
    console.error('Failed to get current chain:', error);
    return null;
  }
}

/**
 * Anchor transaction proof on blockchain
 */
export async function anchorProof(transaction: Transaction): Promise<TransactionProof> {
  if (!isWeb3Available()) {
    throw new Error('Web3 provider not available');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();
    
    const chain = await getCurrentChain();
    if (!chain) {
      throw new Error('Unable to determine current chain');
    }

    // Generate hash
    const hash = await hashTransaction(transaction);

    // Prepare transaction data (hash as hex string)
    // Some chains don't allow data in self-transactions, so use a burn address
    const burnAddress = '0x000000000000000000000000000000000000dEaD';
    
    const txRequest: ethers.TransactionRequest = {
      to: burnAddress,
      value: 0,
      data: hash,
      gasLimit: 100000,
    };

    // Send transaction
    let txResponse: ethers.TransactionResponse;
    try {
      txResponse = await signer.sendTransaction(txRequest);
    } catch (error: any) {
      // If sending to burn address fails, try sending to self
      if (error?.message?.includes('data') || error?.message?.includes('revert')) {
        txRequest.to = from;
        txResponse = await signer.sendTransaction(txRequest);
      } else {
        throw error;
      }
    }

    const txHash = txResponse.hash;

    // Wait for confirmation (best effort, don't block)
    let confirmedHash = txHash;
    try {
      const receipt = await txResponse.wait(1);
      confirmedHash = receipt?.hash || txHash;
    } catch (waitError) {
      console.warn('Transaction confirmation wait failed:', waitError);
      // Continue with pending hash
    }

    const proof: TransactionProof = {
      hash,
      txHash: confirmedHash,
      chain: chain.name,
      timestamp: new Date().toISOString(),
      verified: false,
    };

    return proof;
  } catch (error: any) {
    throw new Error(`Failed to anchor proof: ${error?.message || String(error)}`);
  }
}

/**
 * Verify transaction proof on blockchain
 */
export async function verifyProof(transaction: Transaction): Promise<boolean> {
  if (!transaction.proof || !transaction.proof.txHash) {
    return false;
  }

  if (!isWeb3Available()) {
    return false;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const tx = await provider.getTransaction(transaction.proof.txHash);

    if (!tx || !tx.data) {
      return false;
    }

    // Generate expected hash
    const expectedHash = await hashTransaction(transaction);

    // Compare (normalize to lowercase)
    const normalize = (h: string) => {
      if (!h) return '';
      if (h.startsWith('0x')) {
        return h.toLowerCase();
      }
      return '0x' + h.toLowerCase();
    };

    return normalize(tx.data) === normalize(expectedHash);
  } catch (error) {
    console.error('Proof verification failed:', error);
    return false;
  }
}

/**
 * Get explorer URL for transaction
 */
export function getExplorerUrl(proof: TransactionProof): string | null {
  if (!proof.txHash) {
    return null;
  }

  // Try to find chain config
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.name === proof.chain);
  
  if (chain) {
    return chain.explorerUrl + proof.txHash;
  }

  // Default to Etherscan
  return `https://etherscan.io/tx/${proof.txHash}`;
}

/**
 * Check if proof is verified
 */
export async function checkProofStatus(transaction: Transaction): Promise<TransactionProof | null> {
  if (!transaction.proof) {
    return null;
  }

  const verified = await verifyProof(transaction);
  
  return {
    ...transaction.proof,
    verified,
  };
}

