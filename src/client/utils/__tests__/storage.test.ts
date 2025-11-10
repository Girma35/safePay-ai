/**
 * Storage Utility Tests
 */

import { SessionStorage, TransactionStorage } from '../storage';
import { Transaction } from '../../types';

describe('Storage Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('SessionStorage', () => {
    test('should save and load session', () => {
      const address = '0x1234567890123456789012345678901234567890';
      SessionStorage.saveSession(address);
      const loaded = SessionStorage.loadSession();
      expect(loaded?.address).toBe(address);
    });

    test('should clear session', () => {
      const address = '0x1234567890123456789012345678901234567890';
      SessionStorage.saveSession(address);
      SessionStorage.clearSession();
      const loaded = SessionStorage.loadSession();
      expect(loaded).toBeNull();
    });
  });

  describe('TransactionStorage', () => {
    test('should save and load transactions', async () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          amount: 100,
          type: 'expense',
          category: 'Food',
          timestamp: Date.now(),
        },
      ];

      await TransactionStorage.saveTransactions(transactions, false);
      const loaded = await TransactionStorage.loadTransactions(false);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('1');
    });

    test('should handle empty transactions', async () => {
      await TransactionStorage.saveTransactions([], false);
      const loaded = await TransactionStorage.loadTransactions(false);
      expect(loaded).toEqual([]);
    });
  });
});

