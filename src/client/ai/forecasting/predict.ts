/**
 * Predictive Spending Forecast AI
 * On-device forecasting using lightweight time series analysis
 * No external APIs - all processing happens locally
 */

import { Transaction } from '../../types';

export interface ForecastResult {
  category: string;
  predictedAmount: number;
  confidence: number;
  daysAhead: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ForecastAlert {
  category: string;
  currentSpending: number;
  predictedTotal: number;
  budgetLimit: number;
  daysRemaining: number;
  alertType: 'warning' | 'critical';
  message: string;
}

/**
 * Lightweight exponential smoothing forecast
 * Uses simple exponential smoothing for trend analysis
 */
function exponentialSmoothing(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [values[0]];

  const smoothed: number[] = [values[0]];

  for (let i = 1; i < values.length; i++) {
    const smoothedValue = alpha * values[i] + (1 - alpha) * smoothed[i - 1];
    smoothed.push(smoothedValue);
  }

  return smoothed;
}

/**
 * Calculate linear trend slope
 */
function calculateTrendSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

/**
 * Forecast spending for a category using historical data
 */
export function forecastCategorySpending(
  transactions: Transaction[],
  category: string,
  daysAhead: number = 7,
  historicalDays: number = 30
): ForecastResult | null {
  // Filter transactions for this category
  const categoryTransactions = transactions.filter(
    t => t.category === category &&
         t.type === 'expense' &&
         new Date(t.timestamp).getTime() > Date.now() - (historicalDays * 24 * 60 * 60 * 1000)
  );

  if (categoryTransactions.length < 3) {
    return null; // Not enough data for forecasting
  }

  // Group by day and calculate daily spending
  const dailySpending = new Map<string, number>();
  categoryTransactions.forEach(t => {
    const date = new Date(t.timestamp).toISOString().split('T')[0];
    dailySpending.set(date, (dailySpending.get(date) || 0) + Math.abs(t.amount));
  });

  // Convert to array sorted by date
  const dailyValues = Array.from(dailySpending.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, amount]) => amount);

  if (dailyValues.length < 3) {
    return null;
  }

  // Apply exponential smoothing
  const smoothed = exponentialSmoothing(dailyValues);

  // Calculate trend
  const slope = calculateTrendSlope(smoothed);
  const avgSpending = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (slope > avgSpending * 0.1) trend = 'increasing';
  else if (slope < -avgSpending * 0.1) trend = 'decreasing';

  // Simple linear extrapolation for forecast
  const lastValue = smoothed[smoothed.length - 1];
  const predictedAmount = Math.max(0, lastValue + slope * daysAhead);

  // Calculate confidence based on data consistency
  const variance = smoothed.reduce((sum, val) => sum + Math.pow(val - avgSpending, 2), 0) / smoothed.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgSpending > 0 ? stdDev / avgSpending : 0; // Coefficient of variation
  const confidence = Math.max(0.1, Math.min(1, 1 - cv)); // Higher variance = lower confidence

  // Risk assessment
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (predictedAmount > avgSpending * 2) riskLevel = 'high';
  else if (predictedAmount > avgSpending * 1.5) riskLevel = 'medium';

  return {
    category,
    predictedAmount,
    confidence,
    daysAhead,
    trend,
    riskLevel,
  };
}

/**
 * Generate forecast alerts for budget monitoring
 */
export function generateForecastAlerts(
  transactions: Transaction[],
  budgets: Record<string, number>,
  daysInPeriod: number = 30
): ForecastAlert[] {
  const alerts: ForecastAlert[] = [];
  const now = new Date();
  const periodStart = new Date(now.getTime() - (daysInPeriod * 24 * 60 * 60 * 1000));

  // Get unique categories
  const categories = [...new Set(transactions.map(t => t.category))];

  categories.forEach(category => {
    const budget = budgets[category];
    if (!budget) return;

    // Calculate current spending in period
    const periodTransactions = transactions.filter(
      t => t.category === category &&
           t.type === 'expense' &&
           new Date(t.timestamp) >= periodStart
    );

    const currentSpending = periodTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const daysElapsed = Math.floor((now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
    const daysRemaining = Math.max(1, daysInPeriod - daysElapsed);

    // Forecast remaining spending
    const forecast = forecastCategorySpending(transactions, category, daysRemaining, 60);
    if (!forecast) return;

    const predictedRemaining = forecast.predictedAmount;
    const predictedTotal = currentSpending + predictedRemaining;

    // Check if forecast exceeds budget
    if (predictedTotal > budget * 0.9) { // Alert when within 90% of budget
      const alertType: 'warning' | 'critical' = predictedTotal > budget ? 'critical' : 'warning';

      alerts.push({
        category,
        currentSpending,
        predictedTotal,
        budgetLimit: budget,
        daysRemaining,
        alertType,
        message: alertType === 'critical'
          ? `Predicted to exceed ${category} budget by $${(predictedTotal - budget).toFixed(2)} in ${daysRemaining} days`
          : `Approaching ${category} budget limit. Predicted: $${predictedTotal.toFixed(2)} of $${budget}`,
      });
    }
  });

  return alerts.sort((a, b) => {
    // Sort by severity and then by percentage over budget
    const aSeverity = a.alertType === 'critical' ? 2 : 1;
    const bSeverity = b.alertType === 'critical' ? 2 : 1;
    if (aSeverity !== bSeverity) return bSeverity - aSeverity;

    const aOver = (a.predictedTotal - a.budgetLimit) / a.budgetLimit;
    const bOver = (b.predictedTotal - b.budgetLimit) / b.budgetLimit;
    return bOver - aOver;
  });
}

/**
 * Get spending forecast for all categories
 */
export function getAllCategoryForecasts(
  transactions: Transaction[],
  daysAhead: number = 7
): ForecastResult[] {
  const categories = [...new Set(transactions.map(t => t.category))];
  const forecasts: ForecastResult[] = [];

  categories.forEach(category => {
    const forecast = forecastCategorySpending(transactions, category, daysAhead);
    if (forecast) {
      forecasts.push(forecast);
    }
  });

  return forecasts.sort((a, b) => b.predictedAmount - a.predictedAmount);
}

/**
 * Get forecast insights and recommendations
 */
export function getForecastInsights(
  transactions: Transaction[],
  budgets: Record<string, number> = {}
): string[] {
  const insights: string[] = [];
  const forecasts = getAllCategoryForecasts(transactions, 7);
  const alerts = generateForecastAlerts(transactions, budgets);

  // Add forecast summaries
  if (forecasts.length > 0) {
    const totalPredicted = forecasts.reduce((sum, f) => sum + f.predictedAmount, 0);
    insights.push(`Next 7 days spending forecast: $${totalPredicted.toFixed(2)} across ${forecasts.length} categories`);

    // Highlight top spending categories
    const topForecast = forecasts[0];
    if (topForecast) {
      insights.push(`Highest forecasted spending: ${topForecast.category} ($${topForecast.predictedAmount.toFixed(2)})`);
    }

    // Trend analysis
    const increasing = forecasts.filter(f => f.trend === 'increasing');
    if (increasing.length > 0) {
      insights.push(`${increasing.length} categories show increasing spending trends`);
    }
  }

  // Add budget alerts
  alerts.slice(0, 3).forEach(alert => {
    insights.push(`⚠️ ${alert.message}`);
  });

  return insights;
}