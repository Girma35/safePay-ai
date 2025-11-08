/**
 * Contextual Fraud Detection
 * Advanced anomaly detection with contextual analysis
 * Analyzes transaction patterns, amounts, timing, and user behavior
 * Completely on-device with privacy-first approach
 */

import { Transaction } from '../../types';

export interface FraudAlert {
  id: string;
  transactionId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  confidence: number;
  timestamp: string;
  recommendedAction: 'review' | 'block' | 'allow';
  context: FraudContext;
}

export interface FraudContext {
  transaction: Transaction;
  userProfile: UserProfile;
  historicalPatterns: HistoricalPatterns;
  environmentalFactors: EnvironmentalFactors;
}

export interface UserProfile {
  averageTransactionAmount: number;
  commonCategories: string[];
  usualTimePatterns: TimePattern[];
  locationPatterns: LocationPattern[];
  spendingVelocity: number; // transactions per day
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface HistoricalPatterns {
  categoryAverages: Record<string, number>;
  timeBasedAverages: Record<string, number>;
  seasonalPatterns: SeasonalPattern[];
  peerComparison: PeerComparison;
}

export interface SeasonalPattern {
  period: 'daily' | 'weekly' | 'monthly';
  category: string;
  averageAmount: number;
  standardDeviation: number;
  confidence: number;
}

export interface PeerComparison {
  percentile: number; // User's spending percentile vs peers
  categoryPercentiles: Record<string, number>;
  riskAdjustment: number; // Multiplier for risk calculation
}

export interface TimePattern {
  hour: number;
  dayOfWeek: number;
  frequency: number;
  averageAmount: number;
}

export interface LocationPattern {
  // Note: Location data is optional and user-consented only
  commonLocations?: string[];
  travelPatterns?: TravelPattern[];
}

export interface TravelPattern {
  frequency: number;
  distance: number;
  duration: number;
}

export interface EnvironmentalFactors {
  deviceFingerprint: string;
  networkType: string;
  timeSinceLastTransaction: number;
  sessionDuration: number;
  transactionVelocity: number; // transactions per minute
}

export interface FraudDetectionConfig {
  enabled: boolean;
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  rules: FraudRule[];
  userConsent: boolean;
}

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  condition: (context: FraudContext) => boolean;
  riskScore: number;
  enabled: boolean;
}

/**
 * Contextual Fraud Detection Engine
 */
export class FraudDetectionEngine {
  private config: FraudDetectionConfig;
  private userProfile: UserProfile;
  private historicalData: Transaction[];
  private alerts: FraudAlert[] = [];

  constructor(config: FraudDetectionConfig = this.getDefaultConfig()) {
    this.config = config;
    this.userProfile = this.initializeUserProfile();
    this.historicalData = [];
  }

  /**
   * Get default fraud detection configuration
   */
  private getDefaultConfig(): FraudDetectionConfig {
    return {
      enabled: true,
      riskThresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.95,
      },
      rules: this.getDefaultRules(),
      userConsent: false, // Must be explicitly enabled by user
    };
  }

  /**
   * Get default fraud detection rules
   */
  private getDefaultRules(): FraudRule[] {
    return [
      {
        id: 'amount_anomaly',
        name: 'Amount Anomaly',
        description: 'Transaction amount significantly deviates from historical patterns',
        condition: (context) => this.checkAmountAnomaly(context),
        riskScore: 0.7,
        enabled: true,
      },
      {
        id: 'time_anomaly',
        name: 'Unusual Timing',
        description: 'Transaction occurs at unusual time compared to user patterns',
        condition: (context) => this.checkTimeAnomaly(context),
        riskScore: 0.4,
        enabled: true,
      },
      {
        id: 'velocity_anomaly',
        name: 'High Velocity',
        description: 'Multiple transactions in short time period',
        condition: (context) => this.checkVelocityAnomaly(context),
        riskScore: 0.8,
        enabled: true,
      },
      {
        id: 'category_shift',
        name: 'Category Shift',
        description: 'Sudden change in spending category patterns',
        condition: (context) => this.checkCategoryShift(context),
        riskScore: 0.5,
        enabled: true,
      },
      {
        id: 'location_anomaly',
        name: 'Location Anomaly',
        description: 'Transaction from unusual location (if location data available)',
        condition: (context) => this.checkLocationAnomaly(context),
        riskScore: 0.6,
        enabled: true,
      },
      {
        id: 'peer_comparison',
        name: 'Peer Comparison',
        description: 'Spending significantly higher than similar users',
        condition: (context) => this.checkPeerComparison(context),
        riskScore: 0.3,
        enabled: true,
      },
    ];
  }

  /**
   * Initialize user profile from historical data
   */
  private initializeUserProfile(): UserProfile {
    if (this.historicalData.length === 0) {
      return {
        averageTransactionAmount: 0,
        commonCategories: [],
        usualTimePatterns: [],
        locationPatterns: [],
        spendingVelocity: 0,
        riskTolerance: 'medium',
      };
    }

    const amounts = this.historicalData.map(t => Math.abs(t.amount));
    const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const categoryCounts = this.historicalData.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    const timePatterns = this.analyzeTimePatterns();
    const velocity = this.calculateSpendingVelocity();

    return {
      averageTransactionAmount: averageAmount,
      commonCategories,
      usualTimePatterns: timePatterns,
      locationPatterns: [], // Location data requires user consent
      spendingVelocity: velocity,
      riskTolerance: 'medium',
    };
  }

  /**
   * Analyze transaction timing patterns
   */
  private analyzeTimePatterns(): TimePattern[] {
    const patterns: Record<string, { count: number; totalAmount: number }> = {};

    this.historicalData.forEach(transaction => {
      const date = new Date(transaction.timestamp);
      const key = `${date.getHours()}-${date.getDay()}`;

      if (!patterns[key]) {
        patterns[key] = { count: 0, totalAmount: 0 };
      }

      patterns[key].count++;
      patterns[key].totalAmount += Math.abs(transaction.amount);
    });

    return Object.entries(patterns).map(([key, data]) => {
      const [hour, dayOfWeek] = key.split('-').map(Number);
      return {
        hour,
        dayOfWeek,
        frequency: data.count,
        averageAmount: data.totalAmount / data.count,
      };
    });
  }

  /**
   * Calculate spending velocity (transactions per day)
   */
  private calculateSpendingVelocity(): number {
    if (this.historicalData.length === 0) return 0;

    const dates = this.historicalData.map(t => new Date(t.timestamp).toDateString());
    const uniqueDays = new Set(dates).size;
    const totalDays = uniqueDays || 1;

    return this.historicalData.length / totalDays;
  }

  /**
   * Analyze transaction for fraud patterns
   */
  analyzeTransaction(transaction: Transaction): FraudAlert | null {
    if (!this.config.enabled || !this.config.userConsent) {
      return null;
    }

    const context = this.buildFraudContext(transaction);
    const riskScore = this.calculateRiskScore(context);
    const reasons = this.getRiskReasons(context);

    if (riskScore < this.config.riskThresholds.low) {
      return null; // No alert for low risk
    }

    const riskLevel = this.getRiskLevel(riskScore);
    const recommendedAction = this.getRecommendedAction(riskLevel, riskScore);

    const alert: FraudAlert = {
      id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: String(transaction.id),
      riskLevel,
      reasons,
      confidence: riskScore,
      timestamp: new Date().toISOString(),
      recommendedAction,
      context,
    };

    this.alerts.push(alert);
    return alert;
  }

  /**
   * Build fraud context for analysis
   */
  private buildFraudContext(transaction: Transaction): FraudContext {
    const historicalPatterns = this.buildHistoricalPatterns(transaction);
    const environmentalFactors = this.getEnvironmentalFactors(transaction);

    return {
      transaction,
      userProfile: this.userProfile,
      historicalPatterns,
      environmentalFactors,
    };
  }

  /**
   * Build historical patterns for context
   */
  private buildHistoricalPatterns(transaction: Transaction): HistoricalPatterns {
    const categoryAverages = this.calculateCategoryAverages();
    const timeBasedAverages = this.calculateTimeBasedAverages(transaction);
    const seasonalPatterns = this.analyzeSeasonalPatterns();
    const peerComparison = this.getPeerComparison(transaction);

    return {
      categoryAverages,
      timeBasedAverages,
      seasonalPatterns,
      peerComparison,
    };
  }

  /**
   * Calculate average amounts by category
   */
  private calculateCategoryAverages(): Record<string, number> {
    const categoryTotals: Record<string, { total: number; count: number }> = {};

    this.historicalData.forEach(t => {
      const category = t.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, count: 0 };
      }
      categoryTotals[category].total += Math.abs(t.amount);
      categoryTotals[category].count++;
    });

    const averages: Record<string, number> = {};
    Object.entries(categoryTotals).forEach(([category, data]) => {
      averages[category] = data.total / data.count;
    });

    return averages;
  }

  /**
   * Calculate time-based averages
   */
  private calculateTimeBasedAverages(transaction: Transaction): Record<string, number> {
    const transactionDate = new Date(transaction.timestamp);
    const hour = transactionDate.getHours();
    const dayOfWeek = transactionDate.getDay();

    const similarTransactions = this.historicalData.filter(t => {
      const date = new Date(t.timestamp);
      return date.getHours() === hour && date.getDay() === dayOfWeek;
    });

    const amounts = similarTransactions.map(t => Math.abs(t.amount));
    const average = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;

    return {
      [`hour_${hour}`]: average,
      [`day_${dayOfWeek}`]: average,
      overall: this.userProfile.averageTransactionAmount,
    };
  }

  /**
   * Analyze seasonal spending patterns
   */
  private analyzeSeasonalPatterns(): SeasonalPattern[] {
    const patterns: SeasonalPattern[] = [];

    // Analyze daily patterns
    for (let hour = 0; hour < 24; hour++) {
      const hourTransactions = this.historicalData.filter(t => {
        const date = new Date(t.timestamp);
        return date.getHours() === hour;
      });

      if (hourTransactions.length >= 3) {
        const amounts = hourTransactions.map(t => Math.abs(t.amount));
        const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((acc, amount) => acc + Math.pow(amount - average, 2), 0) / amounts.length;
        const standardDeviation = Math.sqrt(variance);

        patterns.push({
          period: 'daily',
          category: 'all',
          averageAmount: average,
          standardDeviation,
          confidence: Math.min(hourTransactions.length / 10, 1), // Confidence based on sample size
        });
      }
    }

    return patterns;
  }

  /**
   * Get peer comparison data (simplified - in real implementation would use anonymized peer data)
   */
  private getPeerComparison(transaction: Transaction): PeerComparison {
    // Simplified peer comparison - in practice would use anonymized aggregated data
    const userAverage = this.userProfile.averageTransactionAmount;
    const transactionAmount = Math.abs(transaction.amount);

    let percentile = 50; // Default median
    if (transactionAmount > userAverage * 2) percentile = 90;
    else if (transactionAmount > userAverage * 1.5) percentile = 75;
    else if (transactionAmount < userAverage * 0.5) percentile = 25;

    const categoryPercentiles: Record<string, number> = {};
    this.userProfile.commonCategories.forEach(category => {
      categoryPercentiles[category] = 50; // Simplified
    });

    return {
      percentile,
      categoryPercentiles,
      riskAdjustment: percentile > 80 ? 1.2 : percentile < 20 ? 0.8 : 1.0,
    };
  }

  /**
   * Get environmental factors
   */
  private getEnvironmentalFactors(transaction: Transaction): EnvironmentalFactors {
    const recentTransactions = this.historicalData
      .filter(t => new Date(t.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const timeSinceLastTransaction = recentTransactions.length > 0
      ? Date.now() - new Date(recentTransactions[0].timestamp).getTime()
      : Infinity;

    const transactionVelocity = recentTransactions.length / (24 * 60); // transactions per minute over 24 hours

    return {
      deviceFingerprint: 'simplified_fingerprint', // In practice, would generate from device characteristics
      networkType: 'unknown', // Would require additional permissions
      timeSinceLastTransaction,
      sessionDuration: 0, // Would track actual session duration
      transactionVelocity,
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(context: FraudContext): number {
    let totalScore = 0;
    let totalWeight = 0;

    this.config.rules.forEach(rule => {
      if (rule.enabled && rule.condition(context)) {
        totalScore += rule.riskScore;
        totalWeight += 1;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Get reasons for risk score
   */
  private getRiskReasons(context: FraudContext): string[] {
    const reasons: string[] = [];

    this.config.rules.forEach(rule => {
      if (rule.enabled && rule.condition(context)) {
        reasons.push(rule.description);
      }
    });

    return reasons;
  }

  /**
   * Check for amount anomalies
   */
  private checkAmountAnomaly(context: FraudContext): boolean {
    const amount = Math.abs(context.transaction.amount);
    const average = context.userProfile.averageTransactionAmount;
    const threshold = average * 3; // 3x average is suspicious

    return amount > threshold;
  }

  /**
   * Check for timing anomalies
   */
  private checkTimeAnomaly(context: FraudContext): boolean {
    const transactionDate = new Date(context.transaction.timestamp);
    const hour = transactionDate.getHours();
    const dayOfWeek = transactionDate.getDay();

    const usualPatterns = context.userProfile.usualTimePatterns;
    const hasUsualPattern = usualPatterns.some(pattern =>
      pattern.hour === hour && pattern.dayOfWeek === dayOfWeek
    );

    return !hasUsualPattern && usualPatterns.length > 0;
  }

  /**
   * Check for velocity anomalies
   */
  private checkVelocityAnomaly(context: FraudContext): boolean {
    const velocity = context.environmentalFactors.transactionVelocity;
    const threshold = context.userProfile.spendingVelocity * 5; // 5x normal velocity

    return velocity > threshold;
  }

  /**
   * Check for category shifts
   */
  private checkCategoryShift(context: FraudContext): boolean {
    const category = context.transaction.category;
    const isCommonCategory = context.userProfile.commonCategories.includes(category);

    return !isCommonCategory;
  }

  /**
   * Check for location anomalies
   */
  private checkLocationAnomaly(context: FraudContext): boolean {
    // Location checking would require user consent and GPS data
    // For now, return false as we don't have location data
    return false;
  }

  /**
   * Check peer comparison
   */
  private checkPeerComparison(context: FraudContext): boolean {
    const peerComparison = context.historicalPatterns.peerComparison;
    return peerComparison.percentile > 90; // Top 10% spenders
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = this.config.riskThresholds;

    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Get recommended action based on risk level
   */
  private getRecommendedAction(riskLevel: string, score: number): 'review' | 'block' | 'allow' {
    switch (riskLevel) {
      case 'critical':
        return 'block';
      case 'high':
        return score > 0.9 ? 'block' : 'review';
      case 'medium':
        return 'review';
      default:
        return 'allow';
    }
  }

  /**
   * Update user profile with new transaction data
   */
  updateProfile(transactions: Transaction[]): void {
    this.historicalData = [...transactions];
    this.userProfile = this.initializeUserProfile();
  }

  /**
   * Get all active alerts
   */
  getAlerts(): FraudAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FraudDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): FraudDetectionConfig {
    return { ...this.config };
  }

  /**
   * Export fraud detection data (for backup/debugging)
   */
  exportData(): {
    config: FraudDetectionConfig;
    alerts: FraudAlert[];
    profile: UserProfile;
  } {
    return {
      config: this.config,
      alerts: this.alerts,
      profile: this.userProfile,
    };
  }

  /**
   * Import fraud detection data
   */
  importData(data: {
    config?: FraudDetectionConfig;
    alerts?: FraudAlert[];
    profile?: UserProfile;
  }): void {
    if (data.config) this.config = data.config;
    if (data.alerts) this.alerts = data.alerts;
    if (data.profile) this.userProfile = data.profile;
  }
}

/**
 * Create fraud detection engine instance
 */
export function createFraudDetectionEngine(config?: FraudDetectionConfig): FraudDetectionEngine {
  return new FraudDetectionEngine(config);
}

/**
 * Analyze transaction for fraud (convenience function)
 */
export function analyzeTransactionForFraud(
  transaction: Transaction,
  historicalData: Transaction[],
  config?: FraudDetectionConfig
): FraudAlert | null {
  const engine = new FraudDetectionEngine(config);
  engine.updateProfile(historicalData);
  return engine.analyzeTransaction(transaction);
}

/**
 * Get fraud detection status
 */
export function getFraudDetectionStatus(): {
  supported: boolean;
  enabled: boolean;
  requiresConsent: boolean;
} {
  return {
    supported: true, // Always supported as it's on-device
    enabled: false, // Must be explicitly enabled
    requiresConsent: true, // Requires user consent for privacy
  };
}

/**
 * Validate fraud detection configuration
 */
export function validateFraudConfig(config: FraudDetectionConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.riskThresholds.low >= config.riskThresholds.medium) {
    errors.push('Low threshold must be less than medium threshold');
  }

  if (config.riskThresholds.medium >= config.riskThresholds.high) {
    errors.push('Medium threshold must be less than high threshold');
  }

  if (config.riskThresholds.high >= config.riskThresholds.critical) {
    errors.push('High threshold must be less than critical threshold');
  }

  if (config.riskThresholds.critical > 1.0) {
    errors.push('Critical threshold cannot exceed 1.0');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}