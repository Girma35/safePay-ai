/**
 * Settings Page
 * Privacy controls and data management
 */

import React, { useState, useEffect } from 'react';
import { TransactionStorage, EncryptionStorage, ClassifierStorage, BudgetStorage, SessionStorage, TransactionCache } from '../utils/storage';
import { connectWallet, signMessage, disconnectWallet } from '../services/wallet';
import { deriveKeyFromSignature } from '../utils/crypto';
import { Transaction, Classifier } from '../types';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [encryptionAddress, setEncryptionAddress] = useState<string | null>(null);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDisableEncryptConfirm, setShowDisableEncryptConfirm] = useState(false);

  useEffect(() => {
    const address = EncryptionStorage.loadEncryptionAddress();
    setEncryptionAddress(address);
    
    const session = SessionStorage.loadSession();
    setSessionAddress(session?.address || null);
  }, []);

  const handleDisableEncryption = async () => {
    setShowDisableEncryptConfirm(true);
  };

  const confirmDisableEncryption = async () => {
    setShowDisableEncryptConfirm(false);

    setLoading(true);
    setError(null);

    try {
      const { address } = await connectWallet();
      if (address.toLowerCase() !== encryptionAddress?.toLowerCase()) {
        throw new Error('Wallet address does not match encryption address');
      }

      const signature = await signMessage(`SafePay AI encryption key for ${address}`);
      const key = await deriveKeyFromSignature(signature);
      
      // Decrypt and save as plaintext
      const transactions = await TransactionStorage.loadTransactions(true, key);
      const classifier = await ClassifierStorage.loadClassifier(true, key);

      await TransactionStorage.saveTransactions(transactions, false);
      if (classifier) {
        await ClassifierStorage.saveClassifier(classifier, false);
      }

      EncryptionStorage.clearEncryptionAddress();
      TransactionStorage.clearEncryptionKey();
      setEncryptionAddress(null);
      showToast('Encryption disabled successfully', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to disable encryption';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAllData = async () => {
    setShowClearConfirm(false);

    setLoading(true);
    setError(null);

    try {
      TransactionStorage.clearTransactions();
      ClassifierStorage.saveClassifier({ keywords: {} }, false);
      BudgetStorage.saveBudgets({});
      showToast('All data cleared successfully', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to clear data';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const isEncrypted = TransactionStorage.isEncrypted();
      let transactions: Transaction[] = [];
      let classifier: Classifier | null = null;

      if (isEncrypted && encryptionAddress) {
        const { address } = await connectWallet();
        if (address.toLowerCase() !== encryptionAddress.toLowerCase()) {
          throw new Error('Wallet address does not match encryption address');
        }

        const signature = await signMessage(`SafePay AI encryption key for ${address}`);
        const key = await deriveKeyFromSignature(signature);
        
        transactions = await TransactionStorage.loadTransactions(true, key);
        classifier = await ClassifierStorage.loadClassifier(true, key);
      } else {
        transactions = await TransactionStorage.loadTransactions(false);
        classifier = await ClassifierStorage.loadClassifier(false);
      }

      const data = {
        transactions,
        classifier,
        budgets: BudgetStorage.loadBudgets(),
        exportedAt: new Date().toISOString(),
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safepay-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Data exported successfully', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to export data';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    // Best-effort wallet disconnect (may be unsupported)
    try { 
      await disconnectWallet(); 
    } catch (err) {
      // Ignore disconnection errors - not all wallets support programmatic disconnection
      console.log('Wallet disconnection not supported or failed:', err);
    }

    // Clear app session + encryption context + cached decrypted data
    SessionStorage.clearSession();
    EncryptionStorage.clearEncryptionAddress();
    TransactionCache.clearCache();
    
    // Broadcast unified session change so listeners update immediately
    try { 
      window.dispatchEvent(new Event('safepay:session-changed')); 
    } catch {}

    setSessionAddress(null);
    showToast('Disconnected successfully', 'success');
    setTimeout(() => {
      window.location.hash = '#/connect';
    }, 1000);
  };

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="title">Settings</h1>
          <p className="subtitle">Privacy, security, and data management</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="card">
          <h3>Wallet & Authentication</h3>
          <div className="settings-section">
            <div className="settings-item">
              <div>
                <strong>Connected Wallet</strong>
                <p className="small-muted">
                  {sessionAddress ? `${sessionAddress.slice(0, 6)}...${sessionAddress.slice(-4)}` : 'Not connected'}
                </p>
              </div>
              {sessionAddress && (
                <button className="btn btn-ghost" onClick={handleDisconnect}>
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Encryption</h3>
          <div className="settings-section">
            <div className="settings-item">
              <div>
                <strong>Encryption Status</strong>
                <p className="small-muted">
                  {encryptionAddress
                    ? `Enabled (${encryptionAddress.slice(0, 6)}...${encryptionAddress.slice(-4)})`
                    : 'Not enabled - data stored in plaintext'}
                </p>
              </div>
              {encryptionAddress && (
                <button
                  className="btn btn-ghost"
                  onClick={handleDisableEncryption}
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="small" /> : 'Disable Encryption'}
                </button>
              )}
            </div>
            <p className="small-muted">
              Wallet-backed encryption uses your wallet signature to derive an encryption key.
              Only the wallet that created the encryption can decrypt the data.
            </p>
          </div>
        </section>

        <section className="card">
          <h3>Data Management</h3>
          <div className="settings-section">
            <div className="settings-item">
              <div>
                <strong>Export Data</strong>
                <p className="small-muted">Download all your data as a JSON file</p>
              </div>
              <button
                className="btn"
                onClick={handleExportData}
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="small" /> : 'Export Data'}
              </button>
            </div>

            <div className="settings-item">
              <div>
                <strong>Clear All Data</strong>
                <p className="small-muted text-error">Permanently delete all transactions, budgets, and classifier data</p>
              </div>
              <button
                className="btn btn-ghost"
                onClick={handleClearAllData}
                disabled={loading}
                style={{ borderColor: 'var(--color-softred)', color: 'var(--color-softred)' }}
              >
                {loading ? <LoadingSpinner size="small" /> : 'Clear All Data'}
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Privacy</h3>
          <div className="settings-section">
            <ul className="small-muted">
              <li>All data is stored locally on your device</li>
              <li>No data is sent to external servers</li>
              <li>No tracking, analytics, or telemetry</li>
              <li>Encryption is optional and wallet-backed</li>
              <li>Blockchain proofs are opt-in only</li>
            </ul>
          </div>
        </section>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <ConfirmDialog
          isOpen={showClearConfirm}
          title="Clear All Data"
          message="This will permanently delete ALL your data including transactions, budgets, and classifier data. This action cannot be undone. Are you absolutely sure?"
          confirmText="Yes, Delete Everything"
          cancelText="Cancel"
          type="danger"
          onConfirm={confirmClearAllData}
          onCancel={() => setShowClearConfirm(false)}
        />

        <ConfirmDialog
          isOpen={showDisableEncryptConfirm}
          title="Disable Encryption"
          message="Disabling encryption will decrypt your data and store it in plaintext. Your data will still be stored locally, but without encryption. Continue?"
          confirmText="Disable Encryption"
          cancelText="Cancel"
          type="warning"
          onConfirm={confirmDisableEncryption}
          onCancel={() => setShowDisableEncryptConfirm(false)}
        />
      </div>
    </div>
  );
};

export default SettingsPage;
