/**
 * Anomaly detection service
 * Detects fraud, duplicates, and unusual patterns
 * All processing is done on-device
 */

import { Transaction, Anomaly } from '../types';

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  hasAnomalies: boolean;
}

/**
 * Detect anomalies in transactions
 */
export function detectAnomalies(transactions: Transaction[]): AnomalyDetectionResult {
  const anomalies: Anomaly[] = [];

  if (transactions.length === 0) {
    return { anomalies: [], hasAnomalies: false };
  }

  // 1. Detect duplicates (same amount + note within short time)
  const oneHour = 60 * 60 * 1000;
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];
      
      const timeDiff = Math.abs(
        new Date(t1.timestamp).getTime() - new Date(t2.timestamp).getTime()
      );

      if (
        timeDiff <= oneHour &&
        Math.abs(Math.abs(t1.amount) - Math.abs(t2.amount)) < 0.01 &&
        t1.note === t2.note &&
        t1.category === t2.category
      ) {
        anomalies.push({
          type: 'duplicate',
          transactionId: t1.id,
          severity: 'medium',
          message: `Possible duplicate: Similar transaction found within 1 hour (${t2.id})`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Detect unusually high amounts
  const amounts = transactions
    .filter(t => t.type === 'expense')
    .map(t => Math.abs(t.amount));
  
  if (amounts.length > 0) {
    const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length
    );

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const amount = Math.abs(t.amount);
        // Flag if amount is more than 3 standard deviations above mean, or 3x average
        if (amount > avg * 3 && amount > 100) {
          anomalies.push({
            type: 'high-amount',
            transactionId: t.id,
            severity: amount > avg * 5 ? 'high' : 'medium',
            message: `Unusually high expense: $${amount.toFixed(2)} (${(amount / avg).toFixed(1)}x average)`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  }

  // 3. Detect unusual timing (late night / early morning)
  transactions.forEach(t => {
    const hour = new Date(t.timestamp).getHours();
    const amount = Math.abs(t.amount);
    
    // Large transactions at unusual hours (2 AM - 5 AM)
    if ((hour >= 2 && hour < 6) && amount > 50) {
      anomalies.push({
        type: 'unusual-time',
        transactionId: t.id,
        severity: 'low',
        message: `Large transaction at ${hour}:00 (unusual time)`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 4. Detect rapid succession (multiple transactions in short time)
  const sortedByTime = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const thirtyMinutes = 30 * 60 * 1000;
  for (let i = 0; i < sortedByTime.length - 2; i++) {
    const t1 = sortedByTime[i];
    const t2 = sortedByTime[i + 1];
    const t3 = sortedByTime[i + 2];

    const time1 = new Date(t1.timestamp).getTime();
    const time2 = new Date(t2.timestamp).getTime();
    const time3 = new Date(t3.timestamp).getTime();

    if (
      time3 - time1 <= thirtyMinutes &&
      t1.type === 'expense' &&
      t2.type === 'expense' &&
      t3.type === 'expense'
    ) {
      const total = Math.abs(t1.amount) + Math.abs(t2.amount) + Math.abs(t3.amount);
      if (total > 100) {
        anomalies.push({
          type: 'rapid-succession',
          transactionId: t1.id,
          severity: 'medium',
          message: `Rapid succession: 3 transactions totaling $${total.toFixed(2)} within 30 minutes`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return {
    anomalies: anomalies.slice(0, 10), // Limit to 10 most recent
    hasAnomalies: anomalies.length > 0,
  };
}

/**
 * Get anomaly summary
 */
export function getAnomalySummary(anomalies: Anomaly[]): {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
} {
  const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0 };
  const byType: Record<string, number> = {};

  anomalies.forEach(anomaly => {
    bySeverity[anomaly.severity] = (bySeverity[anomaly.severity] || 0) + 1;
    byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;
  });

  return {
    total: anomalies.length,
    bySeverity,
    byType,
  };
}

