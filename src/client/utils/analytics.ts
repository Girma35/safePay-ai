/**
 * Analytics utilities for financial data analysis
 */

import { Transaction, CategoryStat, TrendData, ChartData } from '../types';

/**
 * Calculate category statistics
 */
export function calculateCategoryStats(transactions: Transaction[]): CategoryStat[] {
  const categoryMap = new Map<string, { total: number; count: number }>();

  transactions.forEach(t => {
    if (t.type === 'expense') {
      const existing = categoryMap.get(t.category) || { total: 0, count: 0 };
      categoryMap.set(t.category, {
        total: existing.total + Math.abs(t.amount),
        count: existing.count + 1,
      });
    }
  });

  const total = Array.from(categoryMap.values()).reduce((sum, stat) => sum + stat.total, 0);

  return Array.from(categoryMap.entries())
    .map(([name, stat]) => ({
      name,
      value: stat.total,
      count: stat.count,
      percentage: total > 0 ? (stat.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculate trend data by period
 */
export function calculateTrends(
  transactions: Transaction[],
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
): TrendData[] {
  const trendMap = new Map<string, { income: number; expense: number }>();

  transactions.forEach(t => {
    const date = new Date(t.timestamp);
    let key: string;

    if (period === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const existing = trendMap.get(key) || { income: 0, expense: 0 };
    
    if (t.type === 'income') {
      existing.income += Math.abs(t.amount);
    } else {
      existing.expense += Math.abs(t.amount);
    }

    trendMap.set(key, existing);
  });

  return Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totals]) => ({
      period,
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense,
    }));
}

/**
 * Convert category stats to chart data
 */
export function categoryStatsToChartData(stats: CategoryStat[]): ChartData[] {
  return stats.map(stat => ({
    name: stat.name,
    value: stat.value,
    count: stat.count,
    percentage: stat.percentage,
  }));
}

/**
 * Calculate financial summary
 */
export function calculateSummary(transactions: Transaction[]): {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  averageTransaction: number;
} {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;
  const transactionCount = transactions.length;
  const averageTransaction = transactionCount > 0
    ? (totalIncome + totalExpenses) / transactionCount
    : 0;

  return {
    totalIncome,
    totalExpenses,
    netBalance,
    transactionCount,
    averageTransaction,
  };
}

/**
 * Filter transactions by date range
 */
export function filterByDateRange(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  return transactions.filter(t => {
    const date = new Date(t.timestamp);
    return date >= startDate && date <= endDate;
  });
}

/**
 * Filter transactions by category
 */
export function filterByCategory(
  transactions: Transaction[],
  category: string
): Transaction[] {
  if (category === 'All') {
    return transactions;
  }
  return transactions.filter(t => t.category === category);
}

/**
 * Filter transactions by type
 */
export function filterByType(
  transactions: Transaction[],
  type: 'income' | 'expense' | 'all'
): Transaction[] {
  if (type === 'all') {
    return transactions;
  }
  return transactions.filter(t => t.type === type);
}

/**
 * Search transactions
 */
export function searchTransactions(
  transactions: Transaction[],
  query: string
): Transaction[] {
  if (!query.trim()) {
    return transactions;
  }

  const lowerQuery = query.toLowerCase();

  return transactions.filter(t => {
    const searchableText = [
      t.category,
      t.note || '',
      t.type,
      t.amount.toString(),
    ].join(' ').toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

