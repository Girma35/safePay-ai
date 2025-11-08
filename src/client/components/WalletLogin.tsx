/**
 * Wallet Login Component
 * Client-side authentication - no backend required
 */

import React, { useState, useEffect } from 'react';
import { connectWallet, createAuthMessage, signMessage, isWeb3Available, getCurrentAddress, disconnectWallet } from '../services/wallet';
import { SessionStorage } from '../utils/storage';
import './WalletLogin.css';

interface WalletLoginProps {
  onConnected?: (address: string) => void;
}

const WalletLogin: React.FC<WalletLoginProps> = ({ onConnected }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('WalletLogin: useEffect triggered, checking for existing session...');
    // Check for existing session
    const session = SessionStorage.loadSession();
    console.log('WalletLogin: Loaded session:', session);

    if (session?.address) {
      console.log('WalletLogin: Found existing session, setting address');
      setAddress(session.address);
    } else {
      console.log('WalletLogin: No session found, trying to get current address...');
      // Try to get current address without requesting connection
      getCurrentAddress().then(addr => {
        console.log('WalletLogin: getCurrentAddress result:', addr);
        if (addr) {
          setAddress(addr);
          SessionStorage.saveSession(addr);
          console.log('WalletLogin: Set address from getCurrentAddress');
        } else {
          console.log('WalletLogin: No address from getCurrentAddress');
        }
      }).catch(err => {
        console.log('WalletLogin: getCurrentAddress failed:', err);
      });
    }
  }, []);

  const handleConnect = async () => {
    console.log('WalletLogin: Starting connection process...');
    setError(null);
    setLoading(true);

    try {
      console.log('WalletLogin: Checking Web3 availability...');
      if (!isWeb3Available()) {
        throw new Error('No Web3 provider found. Please install MetaMask or another Web3 wallet.');
      }

      console.log('WalletLogin: Connecting wallet...');
      // Connect wallet
      const { address: walletAddress } = await connectWallet();
      console.log('WalletLogin: Wallet connected, address:', walletAddress);

      // Create authentication message
      const message = createAuthMessage(walletAddress);
      console.log('WalletLogin: Created auth message:', message);

      // Sign message (user confirms in wallet)
      console.log('WalletLogin: Requesting signature...');
      await signMessage(message);
      console.log('WalletLogin: Message signed successfully');

      // Save session
      console.log('WalletLogin: Saving session...');
      SessionStorage.saveSession(walletAddress);
      setAddress(walletAddress);
      console.log('WalletLogin: Session saved, address set');

      if (onConnected) {
        console.log('WalletLogin: Calling onConnected callback');
        onConnected(walletAddress);
      }
    } catch (err: any) {
      console.error('WalletLogin: Connection error:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to connect wallet';
      
      if (err?.message?.includes('User rejected')) {
        errorMessage = 'Connection rejected. Please approve the connection in your wallet.';
      } else if (err?.message?.includes('already pending')) {
        errorMessage = 'Connection request already pending. Please check your wallet.';
      } else if (err?.message?.includes('No Web3 provider')) {
        errorMessage = 'No Web3 wallet found. Please install MetaMask or another Web3 wallet.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      // Ignore disconnection errors
    }
    
    SessionStorage.clearSession();
    setAddress(null);
    setError(null);
    if (onConnected) {
      onConnected('');
    }
    // Note: Most Web3 wallets don't support programmatic disconnection.
    // Users must manually disconnect from their wallet extension.
  };

  if (address) {
    return (
      <div className="wallet-login">
        <div className="wallet-login__connected">
          <div className="wallet-login__address">
            <span className="wallet-login__label">Connected:</span>
            <span className="wallet-login__value">{formatAddress(address)}</span>
          </div>
          <button
            className="wallet-login__button wallet-login__button--secondary"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-login">
      <div className="wallet-login__content">
        <h3 className="wallet-login__title">Connect Your Wallet</h3>
        <p className="wallet-login__description">
          Connect using a Web3 wallet (e.g., MetaMask) to authenticate. 
          No email or password required - your wallet is your identity.
        </p>
        
        {error && (
          <div className="wallet-login__error" role="alert">
            {error}
          </div>
        )}

        <button
          className="wallet-login__button wallet-login__button--primary"
          onClick={handleConnect}
          disabled={loading || !isWeb3Available()}
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>

        {!isWeb3Available() && (
          <p className="wallet-login__help">
            Please install a Web3 wallet like{' '}
            <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
              MetaMask
            </a>{' '}
            to continue.
          </p>
        )}

        <div className="wallet-login__privacy">
          <strong>Privacy:</strong> Authentication is performed locally by signing a message with your wallet. 
          No credentials are stored or transmitted to any server.
        </div>
      </div>
    </div>
  );
};

function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default WalletLogin;
