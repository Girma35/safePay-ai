/**
 * Insights Page
 * AI-powered financial insights and analytics
 */

import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Transaction } from '../types';
import { TransactionStorage } from '../utils/storage';
import { generateInsights } from '../services/ai';
import { calculateCategoryStats, calculateTrends, calculateSummary, formatCurrency, categoryStatsToChartData } from '../utils/analytics';
import { detectAnomalies } from '../services/anomaly';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const COLORS = ['#00D1A1', '#4299E1', '#F6AD55', '#E53E3E', '#48BB78', '#9F7AEA', '#ED8936'];

const InsightsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      // Generate on-device insights
      const generatedInsights = generateInsights(transactions);
      setInsights(generatedInsights);

      // Detect anomalies
      const anomalyResult = detectAnomalies(transactions);
      setAnomalies(anomalyResult.anomalies.map(a => a.message));
    }
  }, [transactions]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const isEncrypted = TransactionStorage.isEncrypted();
      const loaded = await TransactionStorage.loadTransactions(isEncrypted);
      setTransactions(loaded);
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

  if (loading) {
    return (
      <div className="container">
        <LoadingSpinner size="large" message="Loading insights..." />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="container">
        <header className="header">
          <div>
            <h1 className="title">Financial Insights</h1>
            <p className="subtitle">AI-powered analytics and spending patterns</p>
          </div>
        </header>
        <EmptyState
          icon="📊"
          title="No Data Available"
          message="Add some transactions to see insights, analytics, and spending patterns."
          actionLabel="Add Transaction"
          onAction={() => { window.location.hash = '#/add'; }}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="title">Financial Insights</h1>
          <p className="subtitle">AI-powered analytics and spending patterns</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Financial Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div className="small-muted">Total Income</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-success)' }}>
              {formatCurrency(summary.totalIncome)}
            </div>
          </div>
          <div>
            <div className="small-muted">Total Expenses</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-softred)' }}>
              {formatCurrency(summary.totalExpenses)}
            </div>
          </div>
          <div>
            <div className="small-muted">Net Balance</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.netBalance >= 0 ? 'var(--color-success)' : 'var(--color-softred)' }}>
              {formatCurrency(summary.netBalance)}
            </div>
          </div>
          <div>
            <div className="small-muted">Transactions</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.transactionCount}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Expense Breakdown</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const name = props.name || '';
                    const percentage = typeof props.percentage === 'number' ? props.percentage : 0;
                    return `${name} (${percentage.toFixed(1)}%)`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="small-muted">No expense data available</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Monthly Trends</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="period" stroke="var(--color-muted)" />
                <YAxis stroke="var(--color-muted)" tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ background: 'var(--color-softgray)', border: '1px solid var(--card-border)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="var(--color-success)" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke="var(--color-softred)" strokeWidth={2} />
                <Line type="monotone" dataKey="net" stroke="var(--color-mint)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="small-muted">No trend data available</p>
          )}
        </div>
      </div>

      {insights.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>AI-Generated Insights</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {insights.map((insight, index) => (
              <li key={index} style={{ marginBottom: 8, color: 'var(--color-offwhite)' }}>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="card alert alert-warning">
          <h3 style={{ marginTop: 0 }}>Anomaly Alerts</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {anomalies.slice(0, 5).map((anomaly, index) => (
              <li key={index} style={{ marginBottom: 8 }}>
                {anomaly}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
