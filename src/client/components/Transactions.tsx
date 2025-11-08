/**
 * Transactions Component (Refactored)
 * Main component for managing transactions
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Transaction, Classifier, Anomaly } from '../types';
import { TransactionStorage, ClassifierStorage, EncryptionStorage, BudgetStorage, TransactionCache } from '../utils/storage';
import { defaultClassifier } from '../lib/classifier';
import { detectAnomalies } from '../services/anomaly';
import { generateInsights } from '../services/ai';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import EncryptionControls from './EncryptionControls';
import BudgetManager from './BudgetManager';
import { useToast } from './Toast';
import './Transactions.css';

interface TransactionsProps {
  showAddForm?: boolean;
  autoFocus?: boolean;
  externalCategory?: string | null;
  externalAmount?: string;
}

const Transactions: React.FC<TransactionsProps> = ({
  showAddForm = true,
  autoFocus = false,
  externalCategory = null,
  externalAmount,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [classifier, setClassifier] = useState<Classifier>(() => defaultClassifier());
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      // Detect anomalies
      const anomalyResult = detectAnomalies(transactions);
      setAnomalies(anomalyResult.anomalies);

      // Generate insights
      const generatedInsights = generateInsights(transactions);
      setInsights(generatedInsights);
    }
  }, [transactions]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const isEncrypted = TransactionStorage.isEncrypted();
      const encryptionAddress = EncryptionStorage.loadEncryptionAddress();
      
      if (isEncrypted && encryptionAddress) {
        setUnlocked(false);
        // Don't load encrypted data automatically - user must unlock
        setTransactions([]);
      } else {
        const loaded = await TransactionStorage.loadTransactions(false);
        setTransactions(loaded);
        setUnlocked(true);
      }

      const loadedClassifier = await ClassifierStorage.loadClassifier(false);
      if (loadedClassifier) {
        setClassifier(loadedClassifier);
      }

      const loadedBudgets = BudgetStorage.loadBudgets();
      setBudgets(loadedBudgets);
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'timestamp' | 'proof'>) => {
    try {
      const newTransaction: Transaction = {
        ...transactionData,
        id: Date.now(),
        timestamp: new Date().toISOString(),
      };

      const updated = [newTransaction, ...transactions];
      setTransactions(updated);

      // Update cache
      await TransactionCache.updateTransactions(updated);

      const isEncrypted = TransactionStorage.isEncrypted();
      if (isEncrypted && unlocked) {
        await TransactionStorage.saveTransactions(updated, true);
      } else {
        await TransactionStorage.saveTransactions(updated, false);
      }

      // Save classifier
      await ClassifierStorage.saveClassifier(classifier, isEncrypted && unlocked);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save transaction';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Failed to save transaction:', err);
    }
  };

    const handleTransactionUpdate = async (updatedTransaction: Transaction) => {
    try {
      const updated = transactions.map(t =>
        t.id === updatedTransaction.id ? updatedTransaction : t
      );
      setTransactions(updated);

      // Update cache
      await TransactionCache.updateTransactions(updated);

      const isEncrypted = TransactionStorage.isEncrypted();
      if (isEncrypted && unlocked) {
        await TransactionStorage.saveTransactions(updated, true);
      } else {
        await TransactionStorage.saveTransactions(updated, false);
      }

      // Save classifier
      await ClassifierStorage.saveClassifier(classifier, isEncrypted && unlocked);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to update transaction';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Failed to update transaction:', err);
    }
  };

  const handleTransactionDelete = useCallback(async (id: string | number) => {
    try {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);

      // Update cache
      await TransactionCache.updateTransactions(updated);

      const isEncrypted = TransactionStorage.isEncrypted();
      if (isEncrypted && unlocked) {
        await TransactionStorage.saveTransactions(updated, true);
      } else {
        await TransactionStorage.saveTransactions(updated, false);
      }
      showToast('Transaction deleted successfully', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to delete transaction';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Failed to delete transaction:', err);
    }
  }, [transactions, unlocked, showToast]);

  const handleTransactionEdit = useCallback(async (updatedTransaction: Transaction) => {
    await handleTransactionUpdate(updatedTransaction);
  }, [handleTransactionUpdate]);

  const handleClassifierUpdate = useCallback(async (updatedClassifier: Classifier) => {
    try {
      setClassifier(updatedClassifier);
      const isEncrypted = TransactionStorage.isEncrypted();
      await ClassifierStorage.saveClassifier(updatedClassifier, isEncrypted && unlocked);
    } catch (err: any) {
      setError(err?.message || 'Failed to save classifier');
      console.error('Failed to save classifier:', err);
    }
  }, [unlocked]);

  const handleTransactionsUpdate = useCallback((updated: Transaction[]) => {
    setTransactions(updated);
    setUnlocked(true);
  }, []);

  const handleUnlock = () => {
    setUnlocked(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="transactions">
        <div className="card">
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions">
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <EncryptionControls
        transactions={transactions}
        classifier={classifier}
        onTransactionsUpdate={handleTransactionsUpdate}
        onClassifierUpdate={handleClassifierUpdate}
        onUnlock={handleUnlock}
      />

      {showAddForm && (
        <div className="card">
          <TransactionForm
            onSubmit={handleAddTransaction}
            classifier={classifier}
            onClassifierUpdate={handleClassifierUpdate}
            externalCategory={externalCategory}
            externalAmount={externalAmount}
            autoFocus={autoFocus}
          />
        </div>
      )}

      {unlocked && (
        <>
          <BudgetManager
            transactions={transactions}
            budgets={budgets}
            onBudgetsUpdate={setBudgets}
          />

          {anomalies.length > 0 && (
            <div className="card alert alert-warning">
              <h4>Anomaly Alerts</h4>
              <ul>
                {anomalies.slice(0, 5).map((anomaly, index) => (
                  <li key={index}>{anomaly.message}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.length > 0 && (
            <div className="card">
              <h4>Quick Insights</h4>
              <ul>
                {insights.slice(0, 3).map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <TransactionList
              transactions={transactions}
              onTransactionUpdate={handleTransactionUpdate}
              onTransactionDelete={handleTransactionDelete}
              onTransactionEdit={handleTransactionEdit}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Transactions;
