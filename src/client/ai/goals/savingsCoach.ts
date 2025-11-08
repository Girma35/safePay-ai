/**
 * Goal-Based Savings Coach
 * Personalized savings recommendations and goal tracking
 * Analyzes spending patterns to suggest optimal savings strategies
 * Provides motivational insights and progress tracking
 * Completely on-device with privacy-first approach
 */

import { Transaction } from '../../types';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: 'emergency_fund' | 'vacation' | 'house' | 'car' | 'retirement' | 'investment' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  milestones: SavingsMilestone[];
  strategy: SavingsStrategy;
}

export interface SavingsMilestone {
  id: string;
  amount: number;
  date: string;
  achieved: boolean;
  reward?: string;
}

export interface SavingsStrategy {
  type: 'automatic' | 'manual' | 'hybrid';
  monthlyContribution: number;
  recommendedPercentage: number; // Percentage of income
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: number; // months
}

export interface SavingsRecommendation {
  id: string;
  type: 'goal_suggestion' | 'contribution_increase' | 'category_reduction' | 'windfall_opportunity';
  title: string;
  description: string;
  impact: {
    monthlySavings: number;
    timeToGoal: number; // months
    confidence: number;
  };
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  expiresAt?: string;
}

export interface SavingsInsight {
  id: string;
  type: 'motivational' | 'behavioral' | 'opportunity' | 'warning';
  title: string;
  message: string;
  data?: any;
  actionable: boolean;
  timestamp: string;
}

export interface SavingsProfile {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  emergencyFundMonths: number;
  riskTolerance: 'low' | 'medium' | 'high';
  financialGoals: string[];
  spendingHabits: SpendingHabit[];
}

export interface SpendingHabit {
  category: string;
  averageMonthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  potentialSavings: number;
  lastUpdated: string;
}

export interface SavingsPlan {
  goals: SavingsGoal[];
  monthlyBudget: number;
  recommendedSavings: number;
  projectedSavings: number[];
  milestones: SavingsMilestone[];
  insights: SavingsInsight[];
}

/**
 * Goal-Based Savings Coach Engine
 */
export class SavingsCoachEngine {
  private goals: SavingsGoal[] = [];
  private profile: SavingsProfile;
  private transactions: Transaction[] = [];
  private insights: SavingsInsight[] = [];

  constructor(profile?: Partial<SavingsProfile>) {
    this.profile = this.initializeProfile(profile);
  }

  /**
   * Initialize savings profile
   */
  private initializeProfile(profile?: Partial<SavingsProfile>): SavingsProfile {
    return {
      monthlyIncome: profile?.monthlyIncome || 0,
      monthlyExpenses: 0,
      savingsRate: 0,
      emergencyFundMonths: 3,
      riskTolerance: profile?.riskTolerance || 'medium',
      financialGoals: profile?.financialGoals || [],
      spendingHabits: [],
      ...profile,
    };
  }

  /**
   * Update profile with transaction data
   */
  updateProfile(transactions: Transaction[]): void {
    this.transactions = [...transactions];
    this.analyzeSpendingHabits();
    this.calculateSavingsMetrics();
  }

  /**
   * Analyze spending habits from transaction data
   */
  private analyzeSpendingHabits(): void {
    const monthlyData = this.groupTransactionsByMonth();
    const habits: SpendingHabit[] = [];

    // Get all categories
    const categories = [...new Set(this.transactions.map(t => t.category))];

    categories.forEach(category => {
      const categoryTransactions = this.transactions.filter(t => t.category === category);
      const monthlyTotals = this.calculateMonthlyTotals(categoryTransactions);

      if (monthlyTotals.length >= 2) {
        const average = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
        const trend = this.calculateTrend(monthlyTotals);
        const potentialSavings = this.calculatePotentialSavings(category, average);

        habits.push({
          category,
          averageMonthly: average,
          trend,
          potentialSavings,
          lastUpdated: new Date().toISOString(),
        });
      }
    });

    this.profile.spendingHabits = habits;
  }

  /**
   * Group transactions by month
   */
  private groupTransactionsByMonth(): Record<string, Transaction[]> {
    const monthlyGroups: Record<string, Transaction[]> = {};

    this.transactions.forEach(transaction => {
      const date = new Date(transaction.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyGroups[key]) {
        monthlyGroups[key] = [];
      }

      monthlyGroups[key].push(transaction);
    });

    return monthlyGroups;
  }

  /**
   * Calculate monthly totals for transactions
   */
  private calculateMonthlyTotals(transactions: Transaction[]): number[] {
    const monthlyGroups = this.groupTransactionsByMonth();

    return Object.values(monthlyGroups).map(monthTransactions => {
      return monthTransactions
        .filter(t => transactions.some(ct => ct.id === t.id))
        .reduce((total, t) => total + Math.abs(t.amount), 0);
    });
  }

  /**
   * Calculate spending trend
   */
  private calculateTrend(monthlyTotals: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (monthlyTotals.length < 3) return 'stable';

    const recent = monthlyTotals.slice(-3);
    const earlier = monthlyTotals.slice(-6, -3);

    if (earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate potential savings for a category
   */
  private calculatePotentialSavings(category: string, average: number): number {
    const savingsPotentials: Record<string, number> = {
      'Food': 0.15, // 15% reduction potential
      'Transport': 0.20,
      'Entertainment': 0.25,
      'Shopping': 0.30,
      'Utilities': 0.10,
      'Healthcare': 0.05,
    };

    const potential = savingsPotentials[category] || 0.10;
    return average * potential;
  }

  /**
   * Calculate savings metrics
   */
  private calculateSavingsMetrics(): void {
    const monthlyTotals = this.calculateMonthlyTotals(this.transactions);
    const averageMonthlyExpenses = monthlyTotals.length > 0
      ? monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length
      : 0;

    this.profile.monthlyExpenses = averageMonthlyExpenses;
    this.profile.savingsRate = this.profile.monthlyIncome > 0
      ? (this.profile.monthlyIncome - averageMonthlyExpenses) / this.profile.monthlyIncome
      : 0;
  }

  /**
   * Create a new savings goal
   */
  createGoal(goalData: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'updatedAt' | 'milestones' | 'strategy'>): SavingsGoal {
    const goal: SavingsGoal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      milestones: this.generateMilestones(goalData.targetAmount, goalData.targetDate),
      strategy: this.generateSavingsStrategy(goalData.targetAmount, goalData.targetDate, goalData.priority),
    };

    this.goals.push(goal);
    return goal;
  }

  /**
   * Generate milestones for a goal
   */
  private generateMilestones(targetAmount: number, targetDate: string): SavingsMilestone[] {
    const milestones: SavingsMilestone[] = [];
    const targetDateTime = new Date(targetDate).getTime();
    const now = Date.now();
    const totalMonths = Math.max(1, Math.ceil((targetDateTime - now) / (30 * 24 * 60 * 60 * 1000)));

    const milestonePercentages = [0.25, 0.5, 0.75, 1.0];

    milestonePercentages.forEach((percentage, index) => {
      const amount = targetAmount * percentage;
      const monthsFromNow = Math.ceil(totalMonths * percentage);
      const date = new Date(now + monthsFromNow * 30 * 24 * 60 * 60 * 1000);

      milestones.push({
        id: `milestone_${index + 1}`,
        amount,
        date: date.toISOString(),
        achieved: false,
        reward: this.getMilestoneReward(percentage),
      });
    });

    return milestones;
  }

  /**
   * Get milestone reward
   */
  private getMilestoneReward(percentage: number): string {
    if (percentage >= 1.0) return '🎉 Goal achieved! Time for a celebration!';
    if (percentage >= 0.75) return '🏆 Three-quarters there! You\'re crushing it!';
    if (percentage >= 0.5) return '💪 Halfway point reached! Keep the momentum!';
    return '🎯 First milestone hit! You\'re on your way!';
  }

  /**
   * Generate savings strategy for a goal
   */
  private generateSavingsStrategy(
    targetAmount: number,
    targetDate: string,
    priority: 'low' | 'medium' | 'high'
  ): SavingsStrategy {
    const targetDateTime = new Date(targetDate).getTime();
    const now = Date.now();
    const monthsToTarget = Math.max(1, Math.ceil((targetDateTime - now) / (30 * 24 * 60 * 60 * 1000)));

    const monthlyContribution = targetAmount / monthsToTarget;
    const recommendedPercentage = this.profile.monthlyIncome > 0
      ? (monthlyContribution / this.profile.monthlyIncome) * 100
      : 0;

    let riskLevel: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
    if (priority === 'high' || monthsToTarget < 6) riskLevel = 'aggressive';
    if (priority === 'low' || monthsToTarget > 24) riskLevel = 'conservative';

    return {
      type: 'automatic',
      monthlyContribution,
      recommendedPercentage,
      riskLevel,
      timeHorizon: monthsToTarget,
    };
  }

  /**
   * Get personalized savings recommendations
   */
  getRecommendations(): SavingsRecommendation[] {
    const recommendations: SavingsRecommendation[] = [];

    // Goal-based recommendations
    this.goals.filter(g => g.status === 'active').forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const monthsLeft = this.calculateMonthsToTarget(goal.targetDate);

      if (progress < 50 && monthsLeft < 6) {
        recommendations.push({
          id: `rec_${goal.id}_accelerate`,
          type: 'contribution_increase',
          title: `Accelerate ${goal.name}`,
          description: `You're ${progress.toFixed(1)}% towards your goal with ${monthsLeft} months left. Consider increasing your monthly contribution.`,
          impact: {
            monthlySavings: goal.strategy.monthlyContribution * 0.2,
            timeToGoal: -Math.ceil(monthsLeft * 0.1),
            confidence: 0.8,
          },
          actionable: true,
          priority: 'high',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    });

    // Spending habit recommendations
    this.profile.spendingHabits
      .filter(habit => habit.potentialSavings > 50)
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, 3)
      .forEach(habit => {
        recommendations.push({
          id: `rec_${habit.category}_reduce`,
          type: 'category_reduction',
          title: `Reduce ${habit.category} spending`,
          description: `You could save $${habit.potentialSavings.toFixed(0)} monthly in ${habit.category}. ${habit.trend === 'increasing' ? 'Spending is trending up.' : 'Consider optimizing this category.'}`,
          impact: {
            monthlySavings: habit.potentialSavings,
            timeToGoal: this.calculateTimeToGoalWithSavings(habit.potentialSavings),
            confidence: 0.7,
          },
          actionable: true,
          priority: habit.potentialSavings > 200 ? 'high' : 'medium',
          category: habit.category,
        });
      });

    // Emergency fund recommendation
    if (this.profile.emergencyFundMonths < 3) {
      const monthlySavings = Math.max(500, this.profile.monthlyIncome * 0.1);
      recommendations.push({
        id: 'rec_emergency_fund',
        type: 'goal_suggestion',
        title: 'Build Emergency Fund',
        description: 'Consider building a 3-6 month emergency fund for financial security.',
        impact: {
          monthlySavings: monthlySavings,
          timeToGoal: Math.ceil((monthlySavings * 6) / monthlySavings), // 6 months
          confidence: 0.9,
        },
        actionable: true,
        priority: 'high',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate months to target date
   */
  private calculateMonthsToTarget(targetDate: string): number {
    const target = new Date(targetDate).getTime();
    const now = Date.now();
    return Math.max(1, Math.ceil((target - now) / (30 * 24 * 60 * 60 * 1000)));
  }

  /**
   * Calculate time to goal with additional savings
   */
  private calculateTimeToGoalWithSavings(additionalSavings: number): number {
    if (this.goals.length === 0) return 0;

    const activeGoals = this.goals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) return 0;

    // Calculate for the highest priority goal
    const goal = activeGoals[0];
    const remaining = goal.targetAmount - goal.currentAmount;
    const totalMonthly = goal.strategy.monthlyContribution + additionalSavings;

    return totalMonthly > 0 ? Math.ceil(remaining / totalMonthly) : Infinity;
  }

  /**
   * Generate motivational insights
   */
  generateInsights(): SavingsInsight[] {
    const insights: SavingsInsight[] = [];

    // Progress insights
    this.goals.filter(g => g.status === 'active').forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const monthsLeft = this.calculateMonthsToTarget(goal.targetDate);

      if (progress > 75) {
        insights.push({
          id: `insight_${goal.id}_progress`,
          type: 'motivational',
          title: 'Amazing Progress!',
          message: `You're ${progress.toFixed(1)}% towards ${goal.name}! The finish line is in sight.`,
          actionable: false,
          timestamp: new Date().toISOString(),
        });
      }

      if (monthsLeft < 3 && progress < 80) {
        insights.push({
          id: `insight_${goal.id}_deadline`,
          type: 'warning',
          title: 'Deadline Approaching',
          message: `Only ${monthsLeft} months left for ${goal.name}. Consider adjusting your strategy.`,
          actionable: true,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Savings rate insights
    if (this.profile.savingsRate < 0.1) {
      insights.push({
        id: 'insight_savings_rate',
        type: 'behavioral',
        title: 'Savings Opportunity',
        message: 'Your savings rate is below 10%. Small changes can make a big difference over time.',
        actionable: true,
        timestamp: new Date().toISOString(),
      });
    } else if (this.profile.savingsRate > 0.2) {
      insights.push({
        id: 'insight_savings_excellent',
        type: 'motivational',
        title: 'Excellent Savings Rate!',
        message: `You're saving ${Math.round(this.profile.savingsRate * 100)}% of your income. Keep it up!`,
        actionable: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Habit insights
    const increasingHabits = this.profile.spendingHabits.filter(h => h.trend === 'increasing');
    if (increasingHabits.length > 0) {
      insights.push({
        id: 'insight_spending_trend',
        type: 'warning',
        title: 'Spending Trend Alert',
        message: `${increasingHabits[0].category} spending is increasing. Consider reviewing recent purchases.`,
        actionable: true,
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, amount: number): boolean {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal || goal.status !== 'active') return false;

    goal.currentAmount += amount;
    goal.updatedAt = new Date().toISOString();

    // Check milestones
    goal.milestones.forEach(milestone => {
      if (!milestone.achieved && goal.currentAmount >= milestone.amount) {
        milestone.achieved = true;
      }
    });

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    }

    return true;
  }

  /**
   * Get savings plan summary
   */
  getSavingsPlan(): SavingsPlan {
    const activeGoals = this.goals.filter(g => g.status === 'active');
    const monthlyBudget = this.profile.monthlyIncome - this.profile.monthlyExpenses;
    const recommendedSavings = Math.max(0, monthlyBudget * 0.2); // Recommend 20% savings

    // Calculate projected savings over 12 months
    const projectedSavings: number[] = [];
    let cumulativeSavings = 0;

    for (let i = 0; i < 12; i++) {
      cumulativeSavings += recommendedSavings;
      projectedSavings.push(cumulativeSavings);
    }

    const allMilestones = activeGoals.flatMap(g => g.milestones);
    const insights = this.generateInsights();

    return {
      goals: activeGoals,
      monthlyBudget,
      recommendedSavings,
      projectedSavings,
      milestones: allMilestones,
      insights,
    };
  }

  /**
   * Get all goals
   */
  getGoals(): SavingsGoal[] {
    return [...this.goals];
  }

  /**
   * Get goal by ID
   */
  getGoal(goalId: string): SavingsGoal | null {
    return this.goals.find(g => g.id === goalId) || null;
  }

  /**
   * Update goal
   */
  updateGoal(goalId: string, updates: Partial<SavingsGoal>): boolean {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal) return false;

    Object.assign(goal, updates);
    goal.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Delete goal
   */
  deleteGoal(goalId: string): boolean {
    const index = this.goals.findIndex(g => g.id === goalId);
    if (index === -1) return false;

    this.goals.splice(index, 1);
    return true;
  }

  /**
   * Export savings data
   */
  exportData(): {
    profile: SavingsProfile;
    goals: SavingsGoal[];
    insights: SavingsInsight[];
  } {
    return {
      profile: this.profile,
      goals: this.goals,
      insights: this.insights,
    };
  }

  /**
   * Import savings data
   */
  importData(data: {
    profile?: SavingsProfile;
    goals?: SavingsGoal[];
    insights?: SavingsInsight[];
  }): void {
    if (data.profile) this.profile = data.profile;
    if (data.goals) this.goals = data.goals;
    if (data.insights) this.insights = data.insights;
  }
}

/**
 * Create savings coach engine
 */
export function createSavingsCoach(profile?: Partial<SavingsProfile>): SavingsCoachEngine {
  return new SavingsCoachEngine(profile);
}

/**
 * Generate goal suggestions based on user profile
 */
export function generateGoalSuggestions(profile: SavingsProfile): Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'updatedAt' | 'milestones' | 'strategy'>[] {
  const suggestions: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'updatedAt' | 'milestones' | 'strategy'>[] = [];

  // Emergency fund suggestion
  if (profile.emergencyFundMonths < 3) {
    suggestions.push({
      name: 'Emergency Fund',
      targetAmount: profile.monthlyExpenses * 6,
      targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'emergency_fund',
      priority: 'high',
      status: 'active',
    });
  }

  // Vacation fund
  if (profile.monthlyIncome > 3000) {
    suggestions.push({
      name: 'Dream Vacation',
      targetAmount: Math.min(profile.monthlyIncome * 2, 5000),
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'vacation',
      priority: 'medium',
      status: 'active',
    });
  }

  // Retirement contribution increase
  if (profile.savingsRate < 0.15) {
    suggestions.push({
      name: 'Boost Retirement Savings',
      targetAmount: profile.monthlyIncome * 0.1 * 12, // 10% annual increase
      targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'retirement',
      priority: 'high',
      status: 'active',
    });
  }

  return suggestions;
}

/**
 * Calculate optimal savings rate
 */
export function calculateOptimalSavingsRate(profile: SavingsProfile): {
  recommendedRate: number;
  reasoning: string[];
  breakdown: Record<string, number>;
} {
  let recommendedRate = 0.2; // Default 20%
  const reasoning: string[] = [];
  const breakdown: Record<string, number> = {};

  // Base calculations
  const monthlyIncome = profile.monthlyIncome;
  const monthlyExpenses = profile.monthlyExpenses;
  const currentSavings = monthlyIncome - monthlyExpenses;

  breakdown.needs = monthlyExpenses;
  breakdown.wants = Math.max(0, monthlyIncome * 0.3); // Assume 30% discretionary
  breakdown.savings = Math.max(0, monthlyIncome * 0.2); // 20% savings

  // Adjust based on risk tolerance
  if (profile.riskTolerance === 'low') {
    recommendedRate = 0.15;
    reasoning.push('Conservative approach recommended for low risk tolerance');
  } else if (profile.riskTolerance === 'high') {
    recommendedRate = 0.25;
    reasoning.push('Aggressive savings recommended for high risk tolerance');
  }

  // Adjust based on emergency fund status
  if (profile.emergencyFundMonths < 3) {
    recommendedRate += 0.05;
    reasoning.push('Building emergency fund takes priority');
  }

  // Adjust based on income level
  if (monthlyIncome < 3000) {
    recommendedRate = Math.max(0.1, recommendedRate - 0.05);
    reasoning.push('Lower savings rate appropriate for current income level');
  } else if (monthlyIncome > 10000) {
    recommendedRate += 0.05;
    reasoning.push('Higher savings rate possible with elevated income');
  }

  // Ensure minimum savings
  recommendedRate = Math.max(0.05, recommendedRate);

  return {
    recommendedRate,
    reasoning,
    breakdown,
  };
}