/**
 * Status Badge Component
 * Shows encryption and wallet connection status
 */

import React, { useEffect, useState } from 'react';
import { SessionStorage, EncryptionStorage } from '../utils/storage';
import './StatusBadge.css';

const truncate = (s?: string) => s ? `${s.slice(0, 6)}…${s.slice(-4)}` : '';

const StatusBadge: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [encAddr, setEncAddr] = useState<string | null>(null);

  useEffect(() => {
    const session = SessionStorage.loadSession();
    if (session?.address) {
      setAddress(session.address);
    }

    const encAddress = EncryptionStorage.loadEncryptionAddress();
    if (encAddress) {
      setEncAddr(encAddress);
    }

    // Listen for storage changes
    const handleStorageChange = () => {
      const newSession = SessionStorage.loadSession();
      setAddress(newSession?.address || null);
      const newEncAddr = EncryptionStorage.loadEncryptionAddress();
      setEncAddr(newEncAddr);
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check periodically for same-tab changes
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="status-badge" role="status" aria-live="polite">
      <div className="status-badge__item">
        <span className={`status-badge__indicator status-badge__indicator--${encAddr ? 'encrypted' : 'plain'}`}></span>
        <span className="status-badge__label">{encAddr ? 'Encrypted' : 'Plain'}</span>
      </div>
      <div className="status-badge__item">
        <span className={`status-badge__indicator status-badge__indicator--${address ? 'connected' : 'disconnected'}`}></span>
        <span className="status-badge__label">{address ? truncate(address) : 'Not connected'}</span>
      </div>
    </div>
  );
};

export default StatusBadge;
