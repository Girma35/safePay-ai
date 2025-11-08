/**
 * Storage utilities for SafePay AI
 * Handles localStorage with encryption support
 */

import { Transaction, Classifier, EncryptionConfig } from '../types';
import { deriveKeyFromSignature, encryptWithKey, decryptWithKey } from './crypto';

const STORAGE_KEYS = {
  TRANSACTIONS: 'safepay_txns_v1',
  CLASSIFIER: 'safepay_classifier_v1',
  BUDGETS: 'safepay_budgets_v1',
  SESSION: 'safepay_session',
  ENCRYPTION: 'safepay_enc_addr_v1',
} as const;

/**
 * Storage service for transactions
 */
export class TransactionStorage {
  private static encryptKey: CryptoKey | null = null;

  static setEncryptionKey(key: CryptoKey) {
    this.encryptKey = key;
  }

  static clearEncryptionKey() {
    this.encryptKey = null;
  }

  static getEncryptionKey(): CryptoKey | null {
    return this.encryptKey;
  }

  static async saveTransactions(transactions: Transaction[], encrypted = false): Promise<void> {
    try {
      if (encrypted && this.encryptKey) {
        const encrypted = await encryptWithKey(this.encryptKey, transactions);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, encrypted);
      } else {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      }
    } catch (error) {
      console.error('Failed to save transactions:', error);
      throw new Error('Failed to save transactions');
    }
  }

  static async loadTransactions(encrypted = false, key?: CryptoKey): Promise<Transaction[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!raw) return [];

      if (encrypted && key) {
        const decrypted = await decryptWithKey(key, raw);
        return Array.isArray(decrypted) ? decrypted : [];
      }

      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Invalid JSON - likely encrypted
        return [];
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      return [];
    }
  }

  static isEncrypted(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!raw) return false;
      
      try {
        JSON.parse(raw);
        return false; // Valid JSON = not encrypted
      } catch {
        return true; // Invalid JSON = likely encrypted
      }
    } catch {
      return false;
    }
  }

  static clearTransactions(): void {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  }
}

/**
 * Storage service for classifier
 */
export class ClassifierStorage {
  static async saveClassifier(classifier: Classifier, encrypted = false, key?: CryptoKey): Promise<void> {
    try {
      if (encrypted && key) {
        const encrypted = await encryptWithKey(key, classifier);
        localStorage.setItem(STORAGE_KEYS.CLASSIFIER, encrypted);
      } else {
        localStorage.setItem(STORAGE_KEYS.CLASSIFIER, JSON.stringify(classifier));
      }
    } catch (error) {
      console.error('Failed to save classifier:', error);
    }
  }

  static async loadClassifier(encrypted = false, key?: CryptoKey): Promise<Classifier | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLASSIFIER);
      if (!raw) return null;

      if (encrypted && key) {
        return await decryptWithKey(key, raw);
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load classifier:', error);
      return null;
    }
  }
}

/**
 * Storage service for budgets
 */
export class BudgetStorage {
  static saveBudgets(budgets: Record<string, number>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch (error) {
      console.error('Failed to save budgets:', error);
    }
  }

  static loadBudgets(): Record<string, number> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error('Failed to load budgets:', error);
      return {};
    }
  }
}

/**
 * Storage service for session
 */
export class SessionStorage {
  static saveSession(address: string): void {
    try {
      const session = {
        address,
        connectedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  static loadSession(): { address: string; connectedAt: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  static clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

/**
 * Transaction Cache Service
 * Automatically decrypts and caches transactions in memory for immediate access
 */
export class TransactionCache {
  private static cachedTransactions: Transaction[] | null = null;
  private static cacheLoaded = false;
  private static cachePromise: Promise<void> | null = null;

  static async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;
    if (this.cachePromise) return this.cachePromise;

    this.cachePromise = this._loadCacheInternal();
    return this.cachePromise;
  }

  private static async _loadCacheInternal(): Promise<void> {
    try {
      console.log('TransactionCache: Loading transaction cache...');

      // Check if transactions are encrypted
      const isEncrypted = TransactionStorage.isEncrypted();

      if (!isEncrypted) {
        // Not encrypted, load directly
        console.log('TransactionCache: Loading unencrypted transactions');
        this.cachedTransactions = await TransactionStorage.loadTransactions(false);
      } else {
        // Encrypted, try to decrypt automatically
        console.log('TransactionCache: Transactions are encrypted, attempting auto-decrypt');

        const encryptionAddress = EncryptionStorage.loadEncryptionAddress();
        if (!encryptionAddress) {
          console.log('TransactionCache: No encryption address found');
          this.cachedTransactions = [];
          this.cacheLoaded = true;
          return;
        }

        // Check if we have a connected wallet that matches
        const session = SessionStorage.loadSession();
        if (!session || session.address.toLowerCase() !== encryptionAddress.toLowerCase()) {
          console.log('TransactionCache: No matching wallet session for decryption');
          this.cachedTransactions = [];
          this.cacheLoaded = true;
          return;
        }

        // Try to derive the key and decrypt
        try {
          // Import wallet functions to avoid circular dependency
          const { signMessage } = await import('../services/wallet');
          const { deriveKeyFromSignature } = await import('./crypto');

          const signature = await signMessage(`SafePay AI encryption key for ${session.address}`);
          const key = await deriveKeyFromSignature(signature);

          console.log('TransactionCache: Successfully derived decryption key');
          this.cachedTransactions = await TransactionStorage.loadTransactions(true, key);

          // Set the encryption key for future operations
          TransactionStorage.setEncryptionKey(key);

        } catch (error) {
          console.log('TransactionCache: Failed to auto-decrypt transactions:', error);
          this.cachedTransactions = [];
        }
      }

      this.cacheLoaded = true;
      console.log(`TransactionCache: Loaded ${this.cachedTransactions?.length || 0} transactions into cache`);

    } catch (error) {
      console.error('TransactionCache: Failed to load cache:', error);
      this.cachedTransactions = [];
      this.cacheLoaded = true;
    }
  }

  static getCachedTransactions(): Transaction[] {
    return this.cachedTransactions || [];
  }

  static isCacheLoaded(): boolean {
    return this.cacheLoaded;
  }

  static clearCache(): void {
    this.cachedTransactions = null;
    this.cacheLoaded = false;
    this.cachePromise = null;
    TransactionStorage.clearEncryptionKey();
  }

  static async refreshCache(): Promise<void> {
    this.clearCache();
    await this.loadCache();
  }

  static async addTransaction(transaction: Transaction): Promise<void> {
    if (!this.cachedTransactions) {
      await this.loadCache();
    }

    if (this.cachedTransactions) {
      this.cachedTransactions.push(transaction);

      // Also save to storage
      const isEncrypted = TransactionStorage.isEncrypted();
      await TransactionStorage.saveTransactions(this.cachedTransactions, isEncrypted);
    }
  }

  static async updateTransactions(transactions: Transaction[]): Promise<void> {
    this.cachedTransactions = [...transactions];

    // Also save to storage
    const isEncrypted = TransactionStorage.isEncrypted();
    await TransactionStorage.saveTransactions(transactions, isEncrypted);
  }
}

/**
 * Storage service for encryption config
 */
export class EncryptionStorage {
  static saveEncryptionAddress(address: string): void {
    localStorage.setItem(STORAGE_KEYS.ENCRYPTION, address);
  }

  static loadEncryptionAddress(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ENCRYPTION);
  }

  static clearEncryptionAddress(): void {
    localStorage.removeItem(STORAGE_KEYS.ENCRYPTION);
  }

  static getEncryptionConfig(): EncryptionConfig {
    const address = this.loadEncryptionAddress();
    return {
      enabled: !!address,
      address,
      unlocked: false, // This is managed by the component state
    };
  }
}

/**
 * Export all data for backup
 */
export async function exportAllData(encrypted = false, key?: CryptoKey): Promise<{
  transactions: Transaction[];
  classifier: Classifier | null;
  budgets: Record<string, number>;
  encrypted: boolean;
}> {
  const transactions = await TransactionStorage.loadTransactions(encrypted, key);
  const classifier = await ClassifierStorage.loadClassifier(encrypted, key);
  const budgets = BudgetStorage.loadBudgets();

  return {
    transactions,
    classifier,
    budgets,
    encrypted,
  };
}

/**
 * Import data from backup
 */
export async function importAllData(
  data: {
    transactions: Transaction[];
    classifier?: Classifier | null;
    budgets?: Record<string, number>;
  },
  encrypted = false,
  key?: CryptoKey
): Promise<void> {
  await TransactionStorage.saveTransactions(data.transactions, encrypted);
  
  if (data.classifier) {
    await ClassifierStorage.saveClassifier(data.classifier, encrypted, key);
  }

  if (data.budgets) {
    BudgetStorage.saveBudgets(data.budgets);
  }
}

