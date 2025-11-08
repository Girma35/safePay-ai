/**
 * On-device AI service for expense categorization
 * Uses local machine learning - no data leaves the device
 */

import { Classifier, Transaction } from '../types';
import { tokenize, scoreByClassifier, suggestCategoryFromNote as baseSuggestCategory } from '../lib/classifier';

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason?: string;
}

/**
 * Default categories
 */
export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Salary',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Other',
] as const;

/**
 * Suggest category for a transaction based on note and amount
 * Uses on-device classifier - no external API calls
 */
export function suggestCategory(
  note: string | undefined,
  amount: number,
  classifier: Classifier
): CategorySuggestion {
  // Use the on-device classifier
  const category = baseSuggestCategory(classifier, note, amount);
  
  // Calculate confidence based on classifier scores
  const tokens = tokenize(note);
  const scores = scoreByClassifier(classifier, tokens);
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const categoryScore = scores[category] || 0;
  const confidence = totalScore > 0 ? Math.min(1, categoryScore / totalScore) : 0.3;

  // Generate reason based on tokens
  const reason = tokens.length > 0
    ? `Matched keywords: ${tokens.slice(0, 3).join(', ')}`
    : `Default category based on amount: $${amount}`;

  return {
    category,
    confidence: Math.max(0.3, confidence), // Minimum 30% confidence
    reason,
  };
}

/**
 * Train the classifier with a new transaction
 */
export function trainClassifier(
  classifier: Classifier,
  note: string | undefined,
  category: string
): Classifier {
  const tokens = tokenize(note);
  const updated: Classifier = {
    keywords: { ...classifier.keywords },
  };

  for (const token of tokens) {
    if (!updated.keywords[token]) {
      updated.keywords[token] = {};
    }
    updated.keywords[token][category] = (updated.keywords[token][category] || 0) + 1;
  }

  return updated;
}

/**
 * Generate spending insights from transactions
 * All processing is done on-device
 */
export function generateInsights(transactions: Transaction[]): string[] {
  const insights: string[] = [];

  if (transactions.length === 0) {
    return ['Start adding transactions to see insights'];
  }

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;

  // Net balance insight
  if (netBalance > 0) {
    insights.push(`You have a positive balance of $${netBalance.toFixed(2)}`);
  } else if (netBalance < 0) {
    insights.push(`You're spending $${Math.abs(netBalance).toFixed(2)} more than you earn`);
  }

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    });

  const topCategory = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)[0];

  if (topCategory && totalExpenses > 0) {
    const percentage = (topCategory[1] / totalExpenses) * 100;
    insights.push(
      `Your top spending category is ${topCategory[0]} (${percentage.toFixed(1)}% of expenses)`
    );
  }

  // Monthly comparison (last 30 days vs previous 30 days)
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;
  const last30Days = transactions.filter(
    t => now - new Date(t.timestamp).getTime() <= thirtyDays
  );
  const previous30Days = transactions.filter(
    t => {
      const time = new Date(t.timestamp).getTime();
      return time > now - sixtyDays && time <= now - thirtyDays;
    }
  );

  const last30Expenses = last30Days
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const previous30Expenses = previous30Days
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (previous30Expenses > 0) {
    const change = ((last30Expenses - previous30Expenses) / previous30Expenses) * 100;
    if (Math.abs(change) > 10) {
      const direction = change > 0 ? 'increased' : 'decreased';
      insights.push(
        `Your spending ${direction} by ${Math.abs(change).toFixed(1)}% compared to the previous 30 days`
      );
    }
  }

  // Savings opportunity
  const avgDailyExpense = last30Expenses / 30;
  if (avgDailyExpense > 50) {
    const potentialMonthlySavings = (avgDailyExpense - 50) * 30;
    insights.push(
      `You could save approximately $${potentialMonthlySavings.toFixed(2)} per month by reducing daily expenses by $${(avgDailyExpense - 50).toFixed(2)}`
    );
  }

  return insights;
}

