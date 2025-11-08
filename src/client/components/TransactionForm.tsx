/**
 * Transaction Form Component
 * Handles adding new transactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Transaction, Classifier } from '../types';
import { DEFAULT_CATEGORIES, suggestCategory, trainClassifier } from '../services/ai';
import { defaultClassifier } from '../lib/classifier';
import { useToast } from './Toast';

interface TransactionFormProps {
  onSubmit: (transaction: Omit<Transaction, 'id' | 'timestamp' | 'proof'>) => void;
  classifier: Classifier;
  onClassifierUpdate: (classifier: Classifier) => void;
  externalCategory?: string | null;
  externalAmount?: string;
  autoFocus?: boolean;
  onCategorySuggestion?: (category: string) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  classifier,
  onClassifierUpdate,
  externalCategory,
  externalAmount,
  autoFocus = false,
  onCategorySuggestion,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [userEditedCategory, setUserEditedCategory] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && amountRef.current) {
      amountRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (externalCategory && !userEditedCategory) {
      setCategory(externalCategory);
      setUserEditedCategory(true);
    }
  }, [externalCategory, userEditedCategory]);

  useEffect(() => {
    if (externalAmount && !touched.amount) {
      setAmount(externalAmount);
    }
  }, [externalAmount, touched.amount]);

  // Suggest category when note or amount changes
  useEffect(() => {
    if (note.trim() && !userEditedCategory) {
      const amountNum = parseFloat(amount) || 0;
      const suggestion = suggestCategory(note, amountNum, classifier);
      setSuggestedCategory(suggestion.category);
      if (onCategorySuggestion) {
        onCategorySuggestion(suggestion.category);
      }
    }
  }, [note, amount, classifier, userEditedCategory, onCategorySuggestion]);

  const validateForm = (): boolean => {
    const errors: string[] = [];
    setTouched({ amount: true, category: true });

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || !isFinite(amountNum)) {
      errors.push('Please enter a valid amount');
    } else if (amountNum <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (category === 'Custom' && !customCategory.trim()) {
      errors.push('Please enter a custom category name');
    }

    if (errors.length > 0) {
      setError(errors[0]);
      showToast(errors[0], 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    const amountNum = parseFloat(amount);
    const finalCategory = category === 'Custom' ? (customCategory.trim() || 'Custom') : category;

    const transaction: Omit<Transaction, 'id' | 'timestamp' | 'proof'> = {
      amount: amountNum,
      type,
      category: finalCategory,
      note: note.trim() || undefined,
    };

    // Train classifier
    if (note.trim()) {
      const updatedClassifier = trainClassifier(classifier, note, finalCategory);
      onClassifierUpdate(updatedClassifier);
    }

    onSubmit(transaction);
    showToast(`${type === 'income' ? 'Income' : 'Expense'} added successfully`, 'success');

    // Reset form
    setAmount('');
    setNote('');
    setCustomCategory('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setUserEditedCategory(false);
    setSuggestedCategory(null);
    setTouched({});
    
    if (amountRef.current) {
      amountRef.current.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="transaction-form__grid">
        <div className="transaction-form__field">
          <label htmlFor="amount">Amount *</label>
          <input
            ref={amountRef}
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setTouched({ ...touched, amount: true });
              setError(null);
            }}
            onBlur={() => setTouched({ ...touched, amount: true })}
            placeholder="0.00"
            required
            className={touched.amount && error ? 'input-error' : ''}
          />
          {touched.amount && error && (
            <span className="field-error">{error}</span>
          )}
        </div>

        <div className="transaction-form__field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as 'income' | 'expense')}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div className="transaction-form__field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setUserEditedCategory(true);
            }}
          >
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="Custom">Custom</option>
          </select>
          {suggestedCategory && !userEditedCategory && (
            <div className="transaction-form__suggestion">
              Suggested: <strong>{suggestedCategory}</strong>
            </div>
          )}
        </div>

        <div className="transaction-form__field">
          <label htmlFor="note">Note (optional)</label>
          <input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Coffee at Starbucks"
          />
        </div>

        {category === 'Custom' && (
          <div className="transaction-form__field transaction-form__field--full">
            <label htmlFor="customCategory">Custom Category</label>
            <input
              id="customCategory"
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Enter category name"
              required
            />
          </div>
        )}

        <div className="transaction-form__field transaction-form__field--full">
          <button type="submit" className="btn">
            Add Transaction
          </button>
        </div>
      </div>
    </form>
  );
};

export default TransactionForm;

