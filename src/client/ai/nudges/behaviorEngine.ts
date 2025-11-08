/**
 * Behavioral Nudges Engine
 * Provides contextual insights and gentle reminders about spending habits
 * Uses on-device analysis to deliver personalized, timely nudges
 * Privacy-first: no data collection or external communication
 */

import { Transaction } from '../../types';

export interface SpendingNudge {
  id: string;
  type: 'warning' | 'insight' | 'celebration' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  message: string;
  actionable: boolean;
  timestamp: string;
  expiresAt?: string;
}

export interface NudgeContext {
  currentTime: Date;
  dayOfWeek: number;
  hourOfDay: number;
  isWeekend: boolean;
  recentTransactions: Transaction[];
  budgets: Record<string, number>;
}

/**
 * Generate contextual nudges based on spending patterns and current context
 */
export function generateBehavioralNudges(
  transactions: Transaction[],
  budgets: Record<string, number> = {},
  context?: Partial<NudgeContext>
): SpendingNudge[] {
  const nudges: SpendingNudge[] = [];
  const now = context?.currentTime || new Date();
  const dayOfWeek = context?.dayOfWeek ?? now.getDay();
  const hourOfDay = context?.hourOfDay ?? now.getHours();
  const isWeekend = context?.isWeekend ?? (dayOfWeek === 0 || dayOfWeek === 6);

  // Get recent transactions (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentTransactions = transactions.filter(
    t => new Date(t.timestamp) >= sevenDaysAgo
  );

  // 1. Budget proximity nudges
  const budgetNudges = generateBudgetProximityNudges(recentTransactions, budgets, now);
  nudges.push(...budgetNudges);

  // 2. Spending pattern insights
  const patternNudges = generatePatternInsights(recentTransactions, isWeekend, now);
  nudges.push(...patternNudges);

  // 3. Time-based reminders
  const timeNudges = generateTimeBasedNudges(hourOfDay, dayOfWeek, recentTransactions, now);
  nudges.push(...timeNudges);

  // 4. Achievement celebrations
  const achievementNudges = generateAchievementNudges(transactions, budgets, now);
  nudges.push(...achievementNudges);

  // 5. Unusual activity alerts
  const anomalyNudges = generateAnomalyNudges(recentTransactions, now);
  nudges.push(...anomalyNudges);

  // Sort by priority and recency
  return nudges.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Generate nudges when approaching budget limits
 */
function generateBudgetProximityNudges(
  recentTransactions: Transaction[],
  budgets: Record<string, number>,
  now: Date
): SpendingNudge[] {
  const nudges: SpendingNudge[] = [];

  // Calculate spending for current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySpending: Record<string, number> = {};

  recentTransactions
    .filter(t => t.type === 'expense' && new Date(t.timestamp) >= startOfMonth)
    .forEach(t => {
      monthlySpending[t.category] = (monthlySpending[t.category] || 0) + Math.abs(t.amount);
    });

  // Check each category
  Object.entries(budgets).forEach(([category, budgetLimit]) => {
    const spent = monthlySpending[category] || 0;
    const percentage = (spent / budgetLimit) * 100;

    if (percentage >= 80 && percentage < 100) {
      nudges.push({
        id: `budget-warning-${category}-${now.getTime()}`,
        type: 'warning',
        priority: percentage >= 90 ? 'high' : 'medium',
        category,
        message: `You've spent $${spent.toFixed(2)} of your $${budgetLimit} ${category} budget (${percentage.toFixed(0)}%). ${budgetLimit - spent > 0 ? `$${budgetLimit - spent} remaining.` : 'Over budget!'}`,
        actionable: true,
        timestamp: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24 hours
      });
    } else if (percentage >= 100) {
      nudges.push({
        id: `budget-exceeded-${category}-${now.getTime()}`,
        type: 'warning',
        priority: 'high',
        category,
        message: `You've exceeded your ${category} budget by $${(spent - budgetLimit).toFixed(2)}. Consider reviewing your spending.`,
        actionable: true,
        timestamp: now.toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
      });
    }
  });

  return nudges;
}

/**
 * Generate insights based on spending patterns
 */
function generatePatternInsights(
  recentTransactions: Transaction[],
  isWeekend: boolean,
  now: Date
): SpendingNudge[] {
  const nudges: SpendingNudge[] = [];

  // Weekend spending pattern
  if (isWeekend) {
    const weekendSpending = recentTransactions
      .filter(t => t.type === 'expense' && new Date(t.timestamp).getDay() >= 5)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const weekdaySpending = recentTransactions
      .filter(t => t.type === 'expense' && new Date(t.timestamp).getDay() < 5)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (weekendSpending > weekdaySpending * 1.5 && weekendSpending > 50) {
      nudges.push({
        id: `weekend-spending-${now.getTime()}`,
        type: 'insight',
        priority: 'medium',
        message: `Your weekend spending ($${weekendSpending.toFixed(2)}) is ${((weekendSpending / weekdaySpending) * 100).toFixed(0)}% higher than weekdays. Consider setting weekend limits.`,
        actionable: true,
        timestamp: now.toISOString(),
      });
    }
  }

  // Daily spending average
  const todaySpending = recentTransactions
    .filter(t => t.type === 'expense' &&
           new Date(t.timestamp).toDateString() === now.toDateString())
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (todaySpending > 0) {
    const avgDailySpending = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / 7; // 7-day average

    if (todaySpending > avgDailySpending * 2) {
      nudges.push({
        id: `high-daily-spending-${now.getTime()}`,
        type: 'insight',
        priority: 'low',
        message: `Today's spending ($${todaySpending.toFixed(2)}) is unusually high compared to your $${avgDailySpending.toFixed(2)} daily average.`,
        actionable: false,
        timestamp: now.toISOString(),
      });
    }
  }

  // Category concentration
  const categorySpending: Record<string, number> = {};
  recentTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + Math.abs(t.amount);
    });

  const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
  const topCategory = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b - a)[0];

  if (topCategory && totalSpending > 0) {
    const percentage = (topCategory[1] / totalSpending) * 100;
    if (percentage > 60) {
      nudges.push({
        id: `category-concentration-${now.getTime()}`,
        type: 'insight',
        priority: 'low',
        message: `${topCategory[0]} accounts for ${percentage.toFixed(0)}% of your recent spending. Consider diversifying your budget allocation.`,
        actionable: true,
        timestamp: now.toISOString(),
      });
    }
  }

  return nudges;
}

/**
 * Generate time-based contextual reminders
 */
function generateTimeBasedNudges(
  hourOfDay: number,
  dayOfWeek: number,
  recentTransactions: Transaction[],
  now: Date
): SpendingNudge[] {
  const nudges: SpendingNudge[] = [];

  // Morning coffee reminder
  if (hourOfDay >= 8 && hourOfDay <= 11) {
    const todayCoffee = recentTransactions
      .filter(t => t.type === 'expense' &&
             t.category.toLowerCase().includes('food') &&
             t.note?.toLowerCase().includes('coffee') &&
             new Date(t.timestamp).toDateString() === now.toDateString())
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (todayCoffee > 10) {
      nudges.push({
        id: `coffee-reminder-${now.getTime()}`,
        type: 'reminder',
        priority: 'low',
        message: `You've spent $${todayCoffee.toFixed(2)} on coffee today. Consider brewing at home to save money!`,
        actionable: true,
        timestamp: now.toISOString(),
      });
    }
  }

  // End of week review
  if (dayOfWeek === 5 && hourOfDay >= 18) { // Friday evening
    const weekSpending = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (weekSpending > 0) {
      nudges.push({
        id: `week-review-${now.getTime()}`,
        type: 'insight',
        priority: 'medium',
        message: `This week you've spent $${weekSpending.toFixed(2)}. Take a moment to review your transactions and plan for next week.`,
        actionable: true,
        timestamp: now.toISOString(),
      });
    }
  }

  // Late night spending caution
  if (hourOfDay >= 22 || hourOfDay <= 4) {
    const recentLateNight = recentTransactions
      .filter(t => t.type === 'expense' &&
             (new Date(t.timestamp).getHours() >= 22 || new Date(t.timestamp).getHours() <= 4))
      .slice(-1)[0]; // Last late night transaction

    if (recentLateNight) {
      nudges.push({
        id: `late-night-caution-${now.getTime()}`,
        type: 'reminder',
        priority: 'low',
        message: `Late night spending detected. Remember to review purchases made after 10 PM.`,
        actionable: false,
        timestamp: now.toISOString(),
      });
    }
  }

  return nudges;
}

/**
 * Generate achievement and celebration nudges
 */
function generateAchievementNudges(
  transactions: Transaction[],
  budgets: Record<string, number>,
  now: Date
): SpendingNudge[] {
  const nudges: SpendingNudge[] = [];

  // Budget adherence celebration
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySpending: Record<string, number> = {};

  transactions
    .filter(t => t.type === 'expense' && new Date(t.timestamp) >= startOfMonth)
    .forEach(t => {
      monthlySpending[t.category] = (monthlySpending[t.category] || 0) + Math.abs(t.amount);
    });

  // Check for categories under budget
  Object.entries(budgets).forEach(([category, budgetLimit]) => {
    const spent = monthlySpending[category] || 0;
    const percentage = (spent / budgetLimit) * 100;

    if (percentage <= 75 && spent > 0) {
      nudges.push({
        id: `budget-success-${category}-${now.getTime()}`,
        type: 'celebration',
        priority: 'low',
        category,
        message: `Great job! You're ${percentage.toFixed(0)}% through your ${category} budget with $${(budgetLimit - spent).toFixed(2)} remaining.`,
        actionable: false,
        timestamp: now.toISOString(),
      });
    }
  });

  // Streak tracking (consecutive days under daily budget)
  const dailyBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0) / 30; // Rough daily budget
  let streakDays = 0;

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const daySpending = transactions
      .filter(t => t.type === 'expense' &&
             new Date(t.timestamp).toDateString() === checkDate.toDateString())
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (daySpending <= dailyBudget) {
      streakDays++;
    } else {
      break;
    }
  }

  if (streakDays >= 3) {
    nudges.push({
      id: `spending-streak-${now.getTime()}`,
      type: 'celebration',
      priority: 'medium',
      message: `🎉 ${streakDays}-day streak of staying under your daily budget! Keep it up!`,
      actionable: false,
      timestamp: now.toISOString(),
    });
  }

  return nudges;
}

/**
 * Generate alerts for unusual spending patterns
 */
function generateAnomalyNudges(
  recentTransactions: Transaction[],
  now: Date
): SpendingNudge[] {
  const nudges: SpendingNudge[] = [];

  // Rapid succession spending
  const lastHourTransactions = recentTransactions
    .filter(t => t.type === 'expense' &&
           (now.getTime() - new Date(t.timestamp).getTime()) <= 60 * 60 * 1000);

  if (lastHourTransactions.length >= 3) {
    const total = lastHourTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    if (total > 100) {
      nudges.push({
        id: `rapid-spending-${now.getTime()}`,
        type: 'warning',
        priority: 'medium',
        message: `${lastHourTransactions.length} transactions totaling $${total.toFixed(2)} in the last hour. Double-check these purchases.`,
        actionable: true,
        timestamp: now.toISOString(),
      });
    }
  }

  // Unusually large transaction
  const avgTransaction = recentTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) / Math.max(1, recentTransactions.filter(t => t.type === 'expense').length);

  const largeTransaction = recentTransactions
    .filter(t => t.type === 'expense' && Math.abs(t.amount) > avgTransaction * 3)
    .slice(-1)[0]; // Most recent large transaction

  if (largeTransaction && (now.getTime() - new Date(largeTransaction.timestamp).getTime()) <= 24 * 60 * 60 * 1000) {
    nudges.push({
      id: `large-transaction-${now.getTime()}`,
      type: 'insight',
      priority: 'low',
      message: `Large transaction detected: $${Math.abs(largeTransaction.amount).toFixed(2)} at ${largeTransaction.note || 'Unknown'}. ${(Math.abs(largeTransaction.amount) / avgTransaction).toFixed(1)}x your average transaction.`,
      actionable: false,
      timestamp: now.toISOString(),
    });
  }

  return nudges;
}

/**
 * Filter nudges by type and priority
 */
export function filterNudges(
  nudges: SpendingNudge[],
  types?: SpendingNudge['type'][],
  minPriority?: SpendingNudge['priority']
): SpendingNudge[] {
  return nudges.filter(nudge => {
    if (types && !types.includes(nudge.type)) return false;
    if (minPriority) {
      const priorityOrder = { low: 1, medium: 2, high: 3 };
      if (priorityOrder[nudge.priority] < priorityOrder[minPriority]) return false;
    }
    return true;
  });
}

/**
 * Get nudge statistics
 */
export function getNudgeStats(nudges: SpendingNudge[]): {
  total: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  actionable: number;
} {
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let actionable = 0;

  nudges.forEach(nudge => {
    byType[nudge.type] = (byType[nudge.type] || 0) + 1;
    byPriority[nudge.priority] = (byPriority[nudge.priority] || 0) + 1;
    if (nudge.actionable) actionable++;
  });

  return {
    total: nudges.length,
    byType,
    byPriority,
    actionable,
  };
}