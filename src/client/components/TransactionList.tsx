/**
 * Transaction List Component
 * Displays list of transactions with blockchain proof options
 */

import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/analytics';
import { anchorProof, verifyProof, getExplorerUrl } from '../services/blockchain';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import './TransactionList.css';

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionUpdate: (transaction: Transaction) => void;
  onTransactionDelete?: (id: string | number) => void;
  onTransactionEdit?: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onTransactionUpdate,
  onTransactionDelete,
  onTransactionEdit,
}) => {
  const { showToast } = useToast();
  const [verifying, setVerifying] = useState<Record<string | number, boolean>>({});
  const [anchoring, setAnchoring] = useState<Record<string | number, boolean>>({});
  const [verifyResults, setVerifyResults] = useState<Record<string | number, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transactionId: string | number | null }>({
    isOpen: false,
    transactionId: null,
  });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');

  const handleAnchorProof = async (transaction: Transaction) => {
    setAnchoring({ ...anchoring, [transaction.id]: true });
    try {
      showToast('Anchoring transaction proof on blockchain...', 'info');
      const proof = await anchorProof(transaction);
      const updated: Transaction = {
        ...transaction,
        proof,
      };
      onTransactionUpdate(updated);
      showToast('Transaction proof anchored successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to anchor proof:', error);
      showToast(`Failed to anchor proof: ${error.message}`, 'error');
    } finally {
      setAnchoring({ ...anchoring, [transaction.id]: false });
    }
  };

  const handleVerifyProof = async (transaction: Transaction) => {
    setVerifying({ ...verifying, [transaction.id]: true });
    try {
      const verified = await verifyProof(transaction);
      const message = verified
        ? '✓ Verified: Proof matches on-chain data'
        : '✗ Verification failed: Proof does not match';
      setVerifyResults({
        ...verifyResults,
        [transaction.id]: message,
      });
      showToast(verified ? 'Proof verified successfully' : 'Proof verification failed', verified ? 'success' : 'warning');
    } catch (error: any) {
      const errorMsg = `Verification error: ${error.message}`;
      setVerifyResults({
        ...verifyResults,
        [transaction.id]: errorMsg,
      });
      showToast(errorMsg, 'error');
    } finally {
      setVerifying({ ...verifying, [transaction.id]: false });
    }
  };

  const handleDeleteClick = (id: string | number) => {
    setDeleteConfirm({ isOpen: true, transactionId: id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.transactionId && onTransactionDelete) {
      onTransactionDelete(deleteConfirm.transactionId);
      showToast('Transaction deleted', 'success');
    }
    setDeleteConfirm({ isOpen: false, transactionId: null });
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditAmount(Math.abs(transaction.amount).toString());
    setEditNote(transaction.note || '');
    setEditCategory(transaction.category);
  };

  const handleEditSave = () => {
    if (!editingId) return;
    const transaction = transactions.find(t => t.id === editingId);
    if (!transaction || !onTransactionEdit) return;

    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const updated: Transaction = {
      ...transaction,
      amount: transaction.type === 'expense' ? -amountNum : amountNum,
      note: editNote.trim() || undefined,
      category: editCategory,
    };

    onTransactionEdit(updated);
    showToast('Transaction updated', 'success');
    setEditingId(null);
    setEditAmount('');
    setEditNote('');
    setEditCategory('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditAmount('');
    setEditNote('');
    setEditCategory('');
  };

  if (transactions.length === 0) {
    return (
      <div className="transaction-list__empty">
        <p className="small-muted">No transactions yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="transaction-list">
        <h3>Recent Transactions</h3>
        <ul className="transaction-list__items">
          {transactions.map((transaction) => {
            const isAnchoring = anchoring[transaction.id];
            const isVerifying = verifying[transaction.id];
            const verifyResult = verifyResults[transaction.id];
            const explorerUrl = transaction.proof ? getExplorerUrl(transaction.proof) : null;
            const isEditing = editingId === transaction.id;

            if (isEditing) {
              return (
                <li key={transaction.id} className="transaction-list__item transaction-list__item--editing">
                  <div className="transaction-list__edit-form">
                    <div className="transaction-form__field">
                      <label>Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />
                    </div>
                    <div className="transaction-form__field">
                      <label>Category</label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                      />
                    </div>
                    <div className="transaction-form__field">
                      <label>Note</label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                      />
                    </div>
                    <div className="transaction-list__edit-actions">
                      <button className="btn" onClick={handleEditSave}>Save</button>
                      <button className="btn btn-ghost" onClick={handleEditCancel}>Cancel</button>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li key={transaction.id} className="transaction-list__item">
                <div className="transaction-list__main">
                  <div className="transaction-list__header">
                    <span
                      className={`transaction-list__amount transaction-list__amount--${transaction.type}`}
                    >
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                    <span className="transaction-list__category">{transaction.category}</span>
                  </div>
                  {transaction.note && (
                    <div className="transaction-list__note">{transaction.note}</div>
                  )}
                  <div className="transaction-list__meta">
                    <span className="small-muted">{formatDate(transaction.timestamp, 'long')}</span>
                  </div>
                </div>

                <div className="transaction-list__actions">
                  <div className="transaction-list__action-buttons">
                    {onTransactionEdit && (
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleEditClick(transaction)}
                        title="Edit transaction"
                      >
                        Edit
                      </button>
                    )}
                    {onTransactionDelete && (
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleDeleteClick(transaction.id)}
                        title="Delete transaction"
                        style={{ color: 'var(--color-softred)' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {transaction.proof?.txHash ? (
                    <div className="transaction-list__proof">
                      <div className="transaction-list__proof-status">
                        <span className="badge badge-success">Anchored</span>
                        {transaction.proof.chain && (
                          <span className="small-muted"> on {transaction.proof.chain}</span>
                        )}
                      </div>
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transaction-list__explorer-link"
                        >
                          View on Explorer
                        </a>
                      )}
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleVerifyProof(transaction)}
                        disabled={isVerifying}
                      >
                        {isVerifying ? 'Verifying...' : 'Verify'}
                      </button>
                      {verifyResult && (
                        <div
                          className={`transaction-list__verify-result ${
                            verifyResult.includes('✓') ? 'success' : 'error'
                          }`}
                        >
                          {verifyResult}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleAnchorProof(transaction)}
                      disabled={isAnchoring}
                    >
                      {isAnchoring ? 'Anchoring...' : 'Anchor Proof'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, transactionId: null })}
      />
    </>
  );
};

export default TransactionList;

