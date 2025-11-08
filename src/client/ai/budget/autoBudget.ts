/**
 * AI Budget Auto-Setup
 * Analyzes spending patterns and automatically suggests budget allocations
 * Uses statistical analysis of historical data for intelligent recommendations
 * All processing happens on-device
 */

import { Transaction } from '../../types';

export interface BudgetRecommendation {
  category: string;
  recommendedAmount: number;
  currentAverage: number;
  percentile80th: number;
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  adjustment: 'increase' | 'decrease' | 'maintain';
}

export interface BudgetAnalysis {
  recommendations: BudgetRecommendation[];
  totalRecommended: number;
  totalCurrent: number;
  savings: number;
  insights: string[];
}

/**
 * Calculate statistical measures for spending data
 */
function calculateStats(values: number[]): {
  mean: number;
  median: number;
  percentile80: number;
  percentile90: number;
  stdDev: number;
  min: number;
  max: number;
} {
  if (values.length === 0) {
    return { mean: 0, median: 0, percentile80: 0, percentile90: 0, stdDev: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  // Calculate percentiles
  const percentile80Index = Math.floor(sorted.length * 0.8);
  const percentile90Index = Math.floor(sorted.length * 0.9);
  const percentile80 = sorted[Math.min(percentile80Index, sorted.length - 1)];
  const percentile90 = sorted[Math.min(percentile90Index, sorted.length - 1)];

  // Calculate standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    median,
    percentile80,
    percentile90,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Analyze spending patterns for a category
 */
function analyzeCategorySpending(
  transactions: Transaction[],
  category: string,
  analysisDays: number = 90
): {
  dailySpending: number[];
  weeklySpending: number[];
  monthlySpending: number[];
  totalSpent: number;
  daysAnalyzed: number;
} {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - analysisDays);

  const categoryTransactions = transactions.filter(
    t => t.category === category &&
         t.type === 'expense' &&
         new Date(t.timestamp) >= cutoffDate
  );

  // Group by day
  const dailyMap = new Map<string, number>();
  categoryTransactions.forEach(t => {
    const date = new Date(t.timestamp).toISOString().split('T')[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + Math.abs(t.amount));
  });

  const dailySpending = Array.from(dailyMap.values());

  // Group by week
  const weeklyMap = new Map<string, number>();
  categoryTransactions.forEach(t => {
    const date = new Date(t.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + Math.abs(t.amount));
  });

  const weeklySpending = Array.from(weeklyMap.values());

  // Group by month
  const monthlyMap = new Map<string, number>();
  categoryTransactions.forEach(t => {
    const date = new Date(t.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + Math.abs(t.amount));
  });

  const monthlySpending = Array.from(monthlyMap.values());

  const totalSpent = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    dailySpending,
    weeklySpending,
    monthlySpending,
    totalSpent,
    daysAnalyzed: analysisDays,
  };
}

/**
 * Generate budget recommendation for a category
 */
function generateCategoryRecommendation(
  category: string,
  spendingData: ReturnType<typeof analyzeCategorySpending>,
  currentBudget?: number
): BudgetRecommendation {
  const { dailySpending, weeklySpending, monthlySpending, totalSpent, daysAnalyzed } = spendingData;

  if (dailySpending.length === 0) {
    return {
      category,
      recommendedAmount: 0,
      currentAverage: 0,
      percentile80th: 0,
      confidence: 0,
      reasoning: 'No spending data available for this category',
      riskLevel: 'low',
      adjustment: 'maintain',
    };
  }

  // Calculate statistics
  const dailyStats = calculateStats(dailySpending);
  const weeklyStats = calculateStats(weeklySpending);
  const monthlyStats = calculateStats(monthlySpending);

  // Use 80th percentile as base for conservative budgeting
  let recommendedAmount: number;
  let reasoning: string;
  let confidence: number;

  if (monthlySpending.length >= 2) {
    // Use monthly data if available (most reliable)
    recommendedAmount = monthlyStats.percentile80;
    reasoning = `Based on 80th percentile of monthly spending ($${monthlyStats.percentile80.toFixed(2)})`;
    confidence = Math.min(0.9, monthlySpending.length / 3); // Higher confidence with more data
  } else if (weeklySpending.length >= 4) {
    // Use weekly data extrapolated to monthly
    const monthlyFromWeekly = weeklyStats.percentile80 * 4.33; // Average weeks per month
    recommendedAmount = monthlyFromWeekly;
    reasoning = `Based on 80th percentile of weekly spending ($${weeklyStats.percentile80.toFixed(2)}) × 4.33 weeks`;
    confidence = Math.min(0.8, weeklySpending.length / 6);
  } else {
    // Use daily data extrapolated to monthly
    const monthlyFromDaily = dailyStats.percentile80 * 30;
    recommendedAmount = monthlyFromDaily;
    reasoning = `Based on 80th percentile of daily spending ($${dailyStats.percentile80.toFixed(2)}) × 30 days`;
    confidence = Math.min(0.7, dailySpending.length / 30);
  }

  // Adjust for volatility (high standard deviation = higher buffer)
  const volatilityFactor = Math.max(1, dailyStats.stdDev / Math.max(1, dailyStats.mean));
  recommendedAmount *= Math.min(1.5, 1 + (volatilityFactor - 1) * 0.2);

  // Current average spending
  const currentAverage = totalSpent / (daysAnalyzed / 30); // Monthly average

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (recommendedAmount > currentAverage * 1.5) {
    riskLevel = 'high';
  } else if (recommendedAmount > currentAverage * 1.2) {
    riskLevel = 'medium';
  }

  // Determine adjustment type
  let adjustment: 'increase' | 'decrease' | 'maintain' = 'maintain';
  if (currentBudget) {
    if (recommendedAmount > currentBudget * 1.1) {
      adjustment = 'increase';
    } else if (recommendedAmount < currentBudget * 0.9) {
      adjustment = 'decrease';
    }
  } else {
    adjustment = 'increase'; // New budget
  }

  // Add reasoning details
  if (volatilityFactor > 1.3) {
    reasoning += `. High spending volatility detected (+${((volatilityFactor - 1) * 100).toFixed(0)}% buffer added)`;
  }

  if (dailySpending.length < 14) {
    reasoning += '. Limited data - consider manual review';
    confidence *= 0.8;
  }

  return {
    category,
    recommendedAmount: Math.round(recommendedAmount * 100) / 100, // Round to cents
    currentAverage: Math.round(currentAverage * 100) / 100,
    percentile80th: Math.round((monthlyStats?.percentile80 || weeklyStats?.percentile80 || dailyStats.percentile80) * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    riskLevel,
    adjustment,
  };
}

/**
 * Generate comprehensive budget analysis and recommendations
 */
export function generateBudgetRecommendations(
  transactions: Transaction[],
  currentBudgets: Record<string, number> = {},
  analysisDays: number = 90
): BudgetAnalysis {
  // Get all unique expense categories
  const expenseCategories = [...new Set(
    transactions
      .filter(t => t.type === 'expense')
      .map(t => t.category)
  )];

  const recommendations: BudgetRecommendation[] = [];

  // Generate recommendations for each category
  expenseCategories.forEach(category => {
    const spendingData = analyzeCategorySpending(transactions, category, analysisDays);
    const recommendation = generateCategoryRecommendation(
      category,
      spendingData,
      currentBudgets[category]
    );
    recommendations.push(recommendation);
  });

  // Sort by recommended amount (highest first)
  recommendations.sort((a, b) => b.recommendedAmount - a.recommendedAmount);

  // Calculate totals
  const totalRecommended = recommendations.reduce((sum, rec) => sum + rec.recommendedAmount, 0);
  const totalCurrent = Object.values(currentBudgets).reduce((sum, budget) => sum + budget, 0);
  const savings = totalCurrent - totalRecommended;

  // Generate insights
  const insights: string[] = [];

  if (recommendations.length === 0) {
    insights.push('No expense data available for budget recommendations');
  } else {
    insights.push(`AI analyzed ${expenseCategories.length} spending categories over ${analysisDays} days`);

    const highConfidence = recommendations.filter(r => r.confidence > 0.7);
    if (highConfidence.length > 0) {
      insights.push(`${highConfidence.length} categories have high-confidence recommendations`);
    }

    const adjustments = recommendations.filter(r => r.adjustment !== 'maintain');
    if (adjustments.length > 0) {
      const increases = adjustments.filter(r => r.adjustment === 'increase').length;
      const decreases = adjustments.filter(r => r.adjustment === 'decrease').length;
      insights.push(`Suggested ${increases} budget increases and ${decreases} decreases`);
    }

    if (savings > 0) {
      insights.push(`Potential monthly savings: $${savings.toFixed(2)} by optimizing budgets`);
    } else if (savings < 0) {
      insights.push(`Budget expansion needed: $${Math.abs(savings).toFixed(2)} additional monthly`);
    }

    // Category-specific insights
    const topCategory = recommendations[0];
    if (topCategory && topCategory.recommendedAmount > 0) {
      insights.push(`Largest recommended budget: ${topCategory.category} ($${topCategory.recommendedAmount.toFixed(2)}/month)`);
    }

    const highRisk = recommendations.filter(r => r.riskLevel === 'high');
    if (highRisk.length > 0) {
      insights.push(`${highRisk.length} categories flagged as high risk - monitor closely`);
    }
  }

  return {
    recommendations,
    totalRecommended,
    totalCurrent,
    savings,
    insights,
  };
}

/**
 * Get quick budget setup for new users
 */
export function getQuickBudgetSetup(
  transactions: Transaction[],
  monthlyIncome: number
): {
  budgets: Record<string, number>;
  reasoning: string[];
} {
  const analysis = generateBudgetRecommendations(transactions, {}, 60); // Use 60 days for quicker setup

  // 50/30/20 rule: 50% needs, 30% wants, 20% savings
  const disposableIncome = monthlyIncome * 0.8; // 80% of income for expenses (20% savings)

  // Allocate based on spending patterns, but cap at reasonable percentages
  const budgets: Record<string, number> = {};
  const reasoning: string[] = [];

  reasoning.push(`Based on 50/30/20 budgeting rule with $${monthlyIncome.toFixed(2)} monthly income`);
  reasoning.push(`Allocating 80% ($${disposableIncome.toFixed(2)}) for expenses, 20% for savings`);

  // Essential categories (50% of disposable income)
  const essentials = ['Rent', 'Utilities', 'Food', 'Transport', 'Healthcare'];
  const essentialsBudget = disposableIncome * 0.5;

  // Wants categories (30% of disposable income)
  const wants = ['Entertainment', 'Shopping'];
  const wantsBudget = disposableIncome * 0.3;

  // Allocate essentials first
  essentials.forEach(category => {
    const rec = analysis.recommendations.find(r => r.category === category);
    if (rec && rec.recommendedAmount > 0) {
      budgets[category] = Math.min(rec.recommendedAmount, essentialsBudget / essentials.length);
    }
  });

  // Allocate wants
  wants.forEach(category => {
    const rec = analysis.recommendations.find(r => r.category === category);
    if (rec && rec.recommendedAmount > 0) {
      budgets[category] = Math.min(rec.recommendedAmount, wantsBudget / wants.length);
    }
  });

  // Allocate remaining categories
  analysis.recommendations.forEach(rec => {
    if (!budgets[rec.category] && rec.recommendedAmount > 0) {
      budgets[rec.category] = rec.recommendedAmount;
    }
  });

  const totalBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0);
  reasoning.push(`Total budget allocated: $${totalBudget.toFixed(2)} (${((totalBudget / monthlyIncome) * 100).toFixed(1)}% of income)`);

  return { budgets, reasoning };
}

/**
 * Validate budget recommendations
 */
export function validateBudgetRecommendation(
  recommendation: BudgetRecommendation,
  totalIncome: number
): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check if recommendation exceeds reasonable percentage of income
  const incomePercentage = (recommendation.recommendedAmount / totalIncome) * 100;
  if (incomePercentage > 50) {
    warnings.push(`Budget for ${recommendation.category} exceeds 50% of income (${incomePercentage.toFixed(1)}%)`);
  }

  // Check confidence level
  if (recommendation.confidence < 0.5) {
    warnings.push(`Low confidence recommendation for ${recommendation.category} (${(recommendation.confidence * 100).toFixed(0)}%)`);
  }

  // Check for extreme volatility
  if (recommendation.riskLevel === 'high') {
    warnings.push(`High spending volatility detected for ${recommendation.category} - consider manual review`);
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}