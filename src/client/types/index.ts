/**
 * Core type definitions for SafePay AI
 */

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string | number;
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  timestamp: string;
  proof?: TransactionProof;
}

export interface TransactionProof {
  hash: string;
  txHash?: string;
  chain?: string;
  timestamp?: string;
  verified?: boolean;
}

export interface Classifier {
  keywords: Record<string, Record<string, number>>;
}

export interface Budget {
  category: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
}

export interface BudgetAlert {
  category: string;
  spent: number;
  budget: number;
  percentage: number;
  status: 'warning' | 'exceeded' | 'on-track';
}

export interface Anomaly {
  type: 'duplicate' | 'high-amount' | 'unusual-time' | 'rapid-succession';
  transactionId: string | number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
}

export interface SpendingInsight {
  type: 'category-trend' | 'savings-opportunity' | 'budget-status' | 'spending-pattern';
  title: string;
  message: string;
  actionable?: string;
  timestamp: string;
}

export interface WalletSession {
  address: string;
  connectedAt: string;
}

export interface EncryptionConfig {
  enabled: boolean;
  address: string | null;
  unlocked: boolean;
}

export interface CategoryStat {
  name: string;
  value: number;
  count: number;
  percentage: number;
}

export interface TrendData {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

