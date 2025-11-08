/**
 * Homepage / Dashboard
 * Main dashboard with financial overview
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Transaction } from '../types';
import { TransactionStorage, EncryptionStorage } from '../utils/storage';
import { calculateCategoryStats, calculateTrends, calculateSummary, formatCurrency, categoryStatsToChartData } from '../utils/analytics';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const COLORS = ['#00D1A1', '#4299E1', '#F6AD55', '#E53E3E', '#48BB78', '#9F7AEA', '#ED8936'];

const Homepage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionAddress, setEncryptionAddress] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const encrypted = TransactionStorage.isEncrypted();
      setIsEncrypted(encrypted);
      
      if (encrypted) {
        const address = EncryptionStorage.loadEncryptionAddress();
        setEncryptionAddress(address);
        // Don't load encrypted data automatically
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

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);
  const categoryStats = useMemo(() => calculateCategoryStats(transactions), [transactions]);
  const trendData = useMemo(() => calculateTrends(transactions, 'monthly'), [transactions]);
  const chartData = useMemo(() => categoryStatsToChartData(categoryStats), [categoryStats]);
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  if (loading) {
    return (
      <div className="container">
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">Your financial overview at a glance</p>
        </div>
      </header>

      <div className="main-grid">
        <main>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Financial Summary</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="small-muted">Total Balance</div>
                <div className="summary-value" style={{ color: summary.netBalance >= 0 ? 'var(--color-success)' : 'var(--color-softred)' }}>
                  {isEncrypted ? '🔒 Locked' : formatCurrency(summary.netBalance)}
                </div>
              </div>
              <div className="summary-item">
                <div className="small-muted">Income</div>
                <div className="summary-value" style={{ color: 'var(--color-success)' }}>
                  {isEncrypted ? '🔒' : formatCurrency(summary.totalIncome)}
                </div>
              </div>
              <div className="summary-item">
                <div className="small-muted">Expenses</div>
                <div className="summary-value" style={{ color: 'var(--color-softred)' }}>
                  {isEncrypted ? '🔒' : formatCurrency(summary.totalExpenses)}
                </div>
              </div>
              <div className="summary-item">
                <div className="small-muted">Transactions</div>
                <div className="summary-value">
                  {isEncrypted ? '🔒' : summary.transactionCount}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Recent Transactions</h3>
            {isEncrypted ? (
              <div className="alert alert-warning">
                <p><strong>Encrypted data detected</strong></p>
                <p>Your transactions are encrypted. Unlock using the wallet that encrypted them to view.</p>
                {encryptionAddress && (
                  <p className="small-muted">Encrypted by: <code>{encryptionAddress.slice(0, 6)}...{encryptionAddress.slice(-4)}</code></p>
                )}
                <div style={{ marginTop: 12 }}>
                  <a className="btn" href="#/add">Unlock now</a>
                  <a className="btn btn-ghost" href="#/connect" style={{ marginLeft: 8 }}>Connect wallet</a>
                </div>
              </div>
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                icon="💸"
                title="No Transactions Yet"
                message="Start tracking your finances by adding your first transaction. All data stays on your device."
                actionLabel="Add Transaction"
                onAction={() => { window.location.hash = '#/add'; }}
              />
            ) : (
              <ul className="transaction-list-simple">
                {recentTransactions.map((t) => (
                  <li key={t.id} className="transaction-item-simple">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={`transaction-amount transaction-amount--${t.type}`}>
                          {t.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(t.amount))}
                        </span>
                        <span className="transaction-category">{t.category}</span>
                      </div>
                      {t.note && <div className="small-muted" style={{ marginTop: 4 }}>{t.note}</div>}
                      <div className="small-muted" style={{ marginTop: 4 }}>
                        {new Date(t.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!isEncrypted && transactions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <a className="btn btn-ghost" href="#/history">View All Transactions</a>
              </div>
            )}
          </div>
        </main>

        <aside className="sidebar">
          <div className="card">
            <h4>Category Breakdown</h4>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={(props: any) => {
                      const name = props.name || '';
                      const percentage = typeof props.percentage === 'number' ? props.percentage : 0;
                      return `${name} (${percentage.toFixed(0)}%)`;
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="small-muted">No data to display</p>
            )}
          </div>

          <div className="card">
            <h4>Monthly Trends</h4>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="period" stroke="var(--color-muted)" />
                  <YAxis stroke="var(--color-muted)" tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="net" stroke="var(--color-mint)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="small-muted">No data to display</p>
            )}
          </div>

          <div className="card">
            <h5>Privacy & Security</h5>
            <ul className="small-muted" style={{ margin: 0, paddingLeft: 20 }}>
              <li>All data stored locally on your device</li>
              <li>Optional wallet-backed encryption</li>
              <li>Blockchain proof anchoring available</li>
              <li>No external tracking or analytics</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="footer-spacer" />
    </div>
  );
};

export default Homepage;
