/**
 * Wallet service for Web3 authentication
 * Fully client-side, no backend required
 */

import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletProvider {
  address: string;
  signer: ethers.Signer;
  provider: ethers.BrowserProvider;
}

/**
 * Check if Web3 provider is available
 */
export function isWeb3Available(): boolean {
  if (typeof window === 'undefined') {
    console.log('Wallet: Window not available (server-side)');
    return false;
  }

  // Check for ethereum provider
  if (!window.ethereum) {
    console.log('Wallet: No ethereum provider found');
    return false;
  }

  console.log('Wallet: Web3 provider detected, checking if enabled...');

  // Some wallets might be detected but not enabled
  try {
    // Check if the provider has the required methods
    if (typeof window.ethereum.request !== 'function') {
      console.log('Wallet: Provider missing request method');
      return false;
    }

    console.log('Wallet: Web3 provider is available and has required methods');
    return true;
  } catch (error) {
    console.log('Wallet: Error checking provider:', error);
    return false;
  }
}

/**
 * Connect to wallet and get provider
 */
export async function connectWallet(): Promise<WalletProvider> {
  console.log('Wallet: Starting wallet connection...');

  if (!isWeb3Available()) {
    throw new Error('No Web3 provider found. Please install MetaMask or another Web3 wallet.');
  }

  try {
    console.log('Wallet: Creating ethers provider...');
    const provider = new ethers.BrowserProvider(window.ethereum);

    console.log('Wallet: Requesting account access...');

    // Try the modern way first
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Wallet: eth_requestAccounts succeeded');
    } catch (error) {
      console.log('Wallet: eth_requestAccounts failed, trying legacy method...');
      // Fallback for older wallets
      await provider.send('eth_requestAccounts', []);
      console.log('Wallet: Legacy eth_requestAccounts succeeded');
    }

    console.log('Wallet: Getting signer...');
    const signer = await provider.getSigner();

    console.log('Wallet: Getting address...');
    const address = await signer.getAddress();

    console.log('Wallet: Connection successful, address:', address);

    return {
      address,
      signer,
      provider,
    };
  } catch (error: any) {
    console.error('Wallet: Connection failed:', error);

    // Provide more specific error messages
    if (error?.code === 4001) {
      throw new Error('Connection rejected by user. Please approve the connection in your wallet.');
    } else if (error?.code === -32002) {
      throw new Error('Connection request already pending. Please check your wallet.');
    } else if (error?.message?.includes('User rejected')) {
      throw new Error('Connection rejected by user. Please approve the connection in your wallet.');
    }

    throw new Error(
      error?.message || 'Failed to connect wallet. Please ensure your wallet is unlocked and try again.'
    );
  }
}

/**
 * Sign a message with the connected wallet
 */
export async function signMessage(message: string): Promise<string> {
  console.log('Wallet: Signing message...');
  try {
    // Create provider and get signer (don't reconnect if already connected)
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    console.log('Wallet: Got signer, signing message...');
    const signature = await signer.signMessage(message);
    console.log('Wallet: Message signed successfully');
    return signature;
  } catch (error: any) {
    console.error('Wallet: Message signing failed:', error);
    throw error;
  }
}

/**
 * Get the current connected address (without requesting connection)
 */
export async function getCurrentAddress(): Promise<string | null> {
  console.log('Wallet: getCurrentAddress called');

  if (!isWeb3Available()) {
    console.log('Wallet: getCurrentAddress - no Web3 available');
    return null;
  }

  try {
    console.log('Wallet: getCurrentAddress - creating provider');
    const provider = new ethers.BrowserProvider(window.ethereum);

    console.log('Wallet: getCurrentAddress - listing accounts');
    const accounts = await provider.listAccounts();

    console.log('Wallet: getCurrentAddress - accounts:', accounts);

    if (accounts.length > 0) {
      const address = await accounts[0].getAddress();
      console.log('Wallet: getCurrentAddress - returning address:', address);
      return address;
    }

    console.log('Wallet: getCurrentAddress - no accounts found');
    return null;
  } catch (error) {
    console.log('Wallet: getCurrentAddress - error:', error);
    return null;
  }
}

/**
 * Create an authentication message for the user to sign
 */
export function createAuthMessage(address: string): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  return `SafePay AI Authentication\n\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}\n\nThis signature is used to authenticate your identity. It does not grant any permissions or authorize any transactions.`;
}

/**
 * Verify a signature (client-side verification)
 */
export async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Listen for account changes
 */
export function onAccountChange(callback: (accounts: string[]) => void): () => void {
  if (!isWeb3Available()) {
    return () => {};
  }

  const handler = (accounts: string[]) => {
    callback(accounts);
  };

  window.ethereum?.on('accountsChanged', handler);

  return () => {
    window.ethereum?.removeListener('accountsChanged', handler);
  };
}

/**
 * Attempt to disconnect from wallet (limited support)
 * Note: Most wallets don't support programmatic disconnection
 * This function tries multiple methods to disconnect
 */
export async function disconnectWallet(): Promise<void> {
  if (!isWeb3Available()) {
    return;
  }

  try {
    // Method 1: Some wallets support this method (e.g., WalletConnect)
    if (window.ethereum?.disconnect) {
      await window.ethereum.disconnect();
      console.log('Wallet: Disconnected via disconnect() method');
      return;
    }

    // Method 2: Try to close provider connection (if available)
    if (window.ethereum?.close) {
      await window.ethereum.close();
      console.log('Wallet: Disconnected via close() method');
      return;
    }

    // Method 3: Try to remove all accounts (some wallets support this)
    try {
      await window.ethereum.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
      console.log('Wallet: Revoked permissions');
      return;
    } catch (err) {
      // This method is not supported by most wallets, ignore
    }

    // Note: MetaMask and most browser extension wallets don't support programmatic disconnection
    // Users must disconnect manually from the wallet extension
    console.log('Wallet: Programmatic disconnection not supported by this wallet');
  } catch (error) {
    // Ignore errors - disconnection is not critical
    console.log('Wallet disconnection not supported or failed:', error);
  }
}

