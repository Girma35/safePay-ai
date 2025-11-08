/**
 * Budget management utilities
 */

import { Transaction, Budget, BudgetAlert } from '../types';

/**
 * Calculate budget status for a category
 */
export function calculateBudgetStatus(
  category: string,
  budget: number,
  transactions: Transaction[],
  period: 'monthly' | 'weekly' | 'yearly' = 'monthly'
): BudgetAlert | null {
  const now = new Date();
  let startDate: Date;
  let endDate = new Date();

  if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'weekly') {
    const dayOfWeek = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const categoryTransactions = transactions.filter(
    t => t.category === category && 
         t.type === 'expense' &&
         new Date(t.timestamp) >= startDate &&
         new Date(t.timestamp) <= endDate
  );

  const spent = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;

  let status: 'warning' | 'exceeded' | 'on-track' = 'on-track';
  if (percentage >= 100) {
    status = 'exceeded';
  } else if (percentage >= 80) {
    status = 'warning';
  }

  return {
    category,
    spent,
    budget,
    percentage,
    status,
  };
}

/**
 * Calculate all budget alerts
 */
export function calculateBudgetAlerts(
  budgets: Record<string, number>,
  transactions: Transaction[],
  period: 'monthly' | 'weekly' | 'yearly' = 'monthly'
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  Object.entries(budgets).forEach(([category, budget]) => {
    const status = calculateBudgetStatus(category, budget, transactions, period);
    if (status && status.status !== 'on-track') {
      alerts.push(status);
    }
  });

  return alerts.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Get budget recommendations
 */
export function getBudgetRecommendations(
  budgets: Record<string, number>,
  transactions: Transaction[]
): string[] {
  const recommendations: string[] = [];

  // Calculate average spending per category
  const categoryAverages: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryAverages[t.category] = (categoryAverages[t.category] || 0) + Math.abs(t.amount);
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

  Object.entries(categoryAverages).forEach(([category, total]) => {
    const count = categoryCounts[category];
    const average = total / count;
    const monthlyAverage = average * 30; // Rough estimate

    if (!budgets[category]) {
      recommendations.push(
        `Consider setting a monthly budget of $${monthlyAverage.toFixed(2)} for ${category} based on your spending patterns`
      );
    } else {
      const budget = budgets[category];
      if (monthlyAverage > budget * 1.2) {
        recommendations.push(
          `Your average spending on ${category} ($${monthlyAverage.toFixed(2)}/month) exceeds your budget of $${budget}. Consider adjusting your budget.`
        );
      } else if (monthlyAverage < budget * 0.5) {
        recommendations.push(
          `Your average spending on ${category} ($${monthlyAverage.toFixed(2)}/month) is much lower than your budget of $${budget}. You could reduce your budget to save more.`
        );
      }
    }
  });

  return recommendations;
}

