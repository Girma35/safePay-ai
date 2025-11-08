/**
 * Encryption Controls Component
 * Manages wallet-backed encryption
 */

import React, { useState, useRef } from 'react';
import { connectWallet, signMessage } from '../services/wallet';
import { deriveKeyFromSignature } from '../utils/crypto';
import { TransactionStorage, EncryptionStorage, ClassifierStorage } from '../utils/storage';
import { Transaction, Classifier } from '../types';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';
import './EncryptionControls.css';

interface EncryptionControlsProps {
  transactions: Transaction[];
  classifier: Classifier;
  onTransactionsUpdate: (transactions: Transaction[]) => void;
  onClassifierUpdate: (classifier: Classifier) => void;
  onUnlock: () => void;
}

const EncryptionControls: React.FC<EncryptionControlsProps> = ({
  transactions,
  classifier,
  onTransactionsUpdate,
  onClassifierUpdate,
  onUnlock,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [encryptionAddress, setEncryptionAddress] = useState<string | null>(
    EncryptionStorage.loadEncryptionAddress()
  );
  const [unlocked, setUnlocked] = useState(false);

  const handleEnableEncryption = async () => {
    setError(null);
    setLoading(true);

    try {
      const { address } = await connectWallet();
      const signature = await signMessage(`SafePay AI encryption key for ${address}`);
      const key = await deriveKeyFromSignature(signature);
      
      TransactionStorage.setEncryptionKey(key);
      await TransactionStorage.saveTransactions(transactions, true);
      await ClassifierStorage.saveClassifier(classifier, true, key);
      
      EncryptionStorage.saveEncryptionAddress(address);
      setEncryptionAddress(address);
      setUnlocked(true);
      showToast('Encryption enabled successfully', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to enable encryption';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setError(null);
    setLoading(true);

    try {
      const storedAddress = EncryptionStorage.loadEncryptionAddress();
      if (!storedAddress) {
        throw new Error('No encryption configured');
      }

      const { address } = await connectWallet();
      if (address.toLowerCase() !== storedAddress.toLowerCase()) {
        throw new Error('Wallet address does not match encryption address');
      }

      const signature = await signMessage(`SafePay AI encryption key for ${address}`);
      const key = await deriveKeyFromSignature(signature);
      
      TransactionStorage.setEncryptionKey(key);
      const decryptedTransactions = await TransactionStorage.loadTransactions(true, key);
      const decryptedClassifier = await ClassifierStorage.loadClassifier(true, key);

      if (decryptedClassifier) {
        onClassifierUpdate(decryptedClassifier);
      }
      onTransactionsUpdate(decryptedTransactions);
      setUnlocked(true);
      showToast('Data unlocked successfully', 'success');
      onUnlock();
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to unlock encrypted data';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const isEncrypted = TransactionStorage.isEncrypted();
      
      const data = {
        transactions,
        classifier,
        budgets: {},
        encrypted: isEncrypted,
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safepay-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Backup exported successfully', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to export backup';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.encrypted) {
        // Encrypted backup requires unlocking
        setError('Encrypted backups must be unlocked first. Please unlock your wallet and try again.');
        return;
      }

      if (data.transactions && Array.isArray(data.transactions)) {
        onTransactionsUpdate(data.transactions);
        await TransactionStorage.saveTransactions(data.transactions, false);
      }

      if (data.classifier) {
        onClassifierUpdate(data.classifier);
        await ClassifierStorage.saveClassifier(data.classifier, false);
      }

      showToast('Backup imported successfully', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to import backup';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="encryption-controls">
      <h4>Privacy & Encryption</h4>

      {encryptionAddress ? (
        <div className="encryption-controls__status">
          <div className="encryption-controls__info">
            <strong>Encryption Enabled</strong>
            <span className="small-muted">Wallet: {encryptionAddress.slice(0, 6)}...{encryptionAddress.slice(-4)}</span>
            {!unlocked && (
              <div className="alert alert-warning" style={{ marginTop: 8 }}>
                Data is encrypted. Unlock to view transactions.
              </div>
            )}
          </div>
          {!unlocked && (
            <button
              className="btn"
              onClick={handleUnlock}
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="small" /> : 'Unlock Encrypted Data'}
            </button>
          )}
        </div>
      ) : (
        <div className="encryption-controls__status">
          <div className="encryption-controls__info">
            <strong>Encryption Not Enabled</strong>
            <span className="small-muted">Data is stored in plaintext locally</span>
          </div>
          <button
            className="btn"
            onClick={handleEnableEncryption}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="small" /> : 'Enable Wallet-Backed Encryption'}
          </button>
        </div>
      )}

      <div className="encryption-controls__actions">
        <button className="btn btn-ghost" onClick={handleExport} disabled={loading}>
          {loading ? <LoadingSpinner size="small" /> : 'Export Backup'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="small" /> : 'Import Backup'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default EncryptionControls;

