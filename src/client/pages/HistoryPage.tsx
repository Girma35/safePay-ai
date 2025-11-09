/**
 * History Page
 * View, search, and filter transaction history
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Transaction } from '../types';
import { TransactionStorage, EncryptionStorage, TransactionCache, SessionStorage } from '../utils/storage';
import { formatCurrency, formatDate, filterByCategory, filterByType, searchTransactions, filterByDateRange } from '../utils/analytics';
import { getExplorerUrl } from '../services/blockchain';
import './HistoryPage.css';

const HistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(true);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [historyDisplayed, setHistoryDisplayed] = useState(false);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    // Check if transactions are encrypted
    const encrypted = TransactionStorage.isEncrypted();
    setIsEncrypted(encrypted);

    // Load cache in background
    TransactionCache.loadCache()
      .then(() => {
        setCacheLoading(false);
        // If not encrypted, automatically display history
        if (!encrypted) {
          setTransactions(TransactionCache.getCachedTransactions());
          setHistoryDisplayed(true);
        }
      })
      .catch(error => {
        console.error('Failed to load transaction cache:', error);
        setCacheLoading(false);
      });

    const handleSessionChange = () => {
      const session = SessionStorage.loadSession();
      if (!session) {
        // On logout: hide history immediately
        setHistoryDisplayed(false);
        setTransactions([]);
        setIsEncrypted(false);
        return;
      }
      // On new login: refresh encryption state and cache
      const nowEncrypted = TransactionStorage.isEncrypted();
      setIsEncrypted(nowEncrypted);
      TransactionCache.clearCache();
      TransactionCache.loadCache().then(() => {
        if (!nowEncrypted) {
          setTransactions(TransactionCache.getCachedTransactions());
          setHistoryDisplayed(true);
        } else {
          setTransactions([]);
          setHistoryDisplayed(false);
        }
      });
    };
    window.addEventListener('safepay:session-changed', handleSessionChange);
    return () => window.removeEventListener('safepay:session-changed', handleSessionChange);
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const encrypted = TransactionStorage.isEncrypted();
      setIsEncrypted(encrypted);

      if (encrypted) {
        setTransactions([]);
      } else {
        const loaded = await TransactionStorage.loadTransactions(false);
        setTransactions(loaded);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisplayHistory = async () => {
    setLoading(true);
    try {
      // Ensure cache is loaded
      await TransactionCache.loadCache();

      // Get transactions from cache
      const cachedTransactions = TransactionCache.getCachedTransactions();
      setTransactions(cachedTransactions);
      setHistoryDisplayed(true);
    } catch (error) {
      console.error('Failed to display history:', error);
      setUnlockError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = [...transactions];

    // Apply filters
    if (typeFilter !== 'all') {
      result = filterByType(result, typeFilter);
    }

    if (category !== 'All') {
      result = filterByCategory(result, category);
    }

    if (fromDate || toDate) {
      const start = fromDate ? new Date(fromDate + 'T00:00:00') : new Date(0);
      const end = toDate ? new Date(toDate + 'T23:59:59') : new Date();
      result = filterByDateRange(result, start, end);
    }

    if (query.trim()) {
      result = searchTransactions(result, query);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        return sortDir === 'desc' ? tb - ta : ta - tb;
      } else {
        const aa = Math.abs(a.amount);
        const bb = Math.abs(b.amount);
        return sortDir === 'desc' ? bb - aa : aa - bb;
      }
    });

    return result;
  }, [transactions, query, category, typeFilter, fromDate, toDate, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > pageCount) setPage(Math.max(1, pageCount));
  }, [pageCount, page]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
    const rows = [headers.join(',')];

    filtered.forEach(t => {
      const row = [
        new Date(t.timestamp).toLocaleDateString(),
        t.type,
        `"${t.category}"`,
        Math.abs(t.amount).toFixed(2),
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ];
      rows.push(row.join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safepay-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalShown = filtered.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  if (cacheLoading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading transaction cache...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="title">Transaction History</h1>
          <p className="subtitle">Browse, search, and export your complete transaction history</p>
        </div>
      </header>

      {isEncrypted && !historyDisplayed && (
        <div className="card alert alert-warning">
          <p><strong>Encrypted data detected</strong></p>
          <p>Your transactions are stored securely with wallet-based encryption.</p>
          <div style={{ marginTop: 12 }}>
            <button
              className="btn"
              onClick={handleDisplayHistory}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Display History'}
            </button>
          </div>
          {unlockError && (
            <div className="alert alert-error" style={{ marginTop: 8 }}>
              {unlockError}
            </div>
          )}
        </div>
      )}

      {!isEncrypted && !historyDisplayed && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h3>View Your Transaction History</h3>
            <p className="small-muted">See all transactions from when you started using SafePay AI</p>
            <div style={{ marginTop: 20 }}>
              <button
                className="btn btn-primary"
                onClick={handleDisplayHistory}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Display History'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyDisplayed && (
        <>
          <div className="card">
            <div className="history-filters">
              <input
                type="text"
                placeholder="Search transactions..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="history-search"
              />

              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as 'all' | 'income' | 'expense');
                  setPage(1);
                }}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                placeholder="From date"
              />

              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                placeholder="To date"
              />

              <div className="history-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setSortBy('date');
                    setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                  }}
                >
                  Sort by Date {sortBy === 'date' && (sortDir === 'desc' ? '↓' : '↑')}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setSortBy('amount');
                    setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                  }}
                >
                  Sort by Amount {sortBy === 'amount' && (sortDir === 'desc' ? '↓' : '↑')}
                </button>
                <button className="btn" onClick={handleExportCSV}>
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="history-header">
              <div>
                <strong>{filtered.length}</strong> transactions found
                {filtered.length !== transactions.length && (
                  <span className="small-muted"> (of {transactions.length} total)</span>
                )}
              </div>
              <div>
                <strong>Total (filtered):</strong> {formatCurrency(totalShown)}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="history-empty">
                <p className="small-muted">No transactions found.</p>
                <a className="btn" href="#/add">Add Transaction</a>
              </div>
            ) : (
              <>
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Note</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(t => (
                      <tr key={t.id}>
                        <td>{formatDate(t.timestamp)}</td>
                        <td>
                          <span className={`badge badge-${t.type === 'income' ? 'success' : 'error'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td>{t.category}</td>
                        <td>{t.note || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-softred)' }}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {t.proof?.txHash ? (
                            <a
                              href={getExplorerUrl(t.proof) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="small-muted"
                            >
                              View
                            </a>
                          ) : (
                            <span className="small-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pageCount > 1 && (
                  <div className="history-pagination">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </button>
                    <span className="small-muted">
                      Page {page} of {pageCount}
                    </span>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                      disabled={page >= pageCount}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryPage;
