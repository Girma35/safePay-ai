/**
 * Budget Manager Component
 * Manages budgets and budget alerts
 */

import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { BudgetStorage } from '../utils/storage';
import { calculateBudgetAlerts } from '../utils/budget';
import { DEFAULT_CATEGORIES } from '../services/ai';
import { formatCurrency } from '../utils/analytics';
import './BudgetManager.css';

interface BudgetManagerProps {
  transactions: Transaction[];
  budgets: Record<string, number>;
  onBudgetsUpdate: (budgets: Record<string, number>) => void;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({
  transactions,
  budgets,
  onBudgetsUpdate,
}) => {
  const [newCategory, setNewCategory] = useState<string>('');
  const alerts = calculateBudgetAlerts(budgets, transactions, 'monthly');

  const handleAddBudget = (category: string) => {
    if (!category || budgets[category]) return;
    const updated = { ...budgets, [category]: 0 };
    onBudgetsUpdate(updated);
    BudgetStorage.saveBudgets(updated);
    setNewCategory('');
  };

  const handleUpdateBudget = (category: string, amount: number) => {
    const updated = { ...budgets, [category]: amount };
    onBudgetsUpdate(updated);
    BudgetStorage.saveBudgets(updated);
  };

  const handleRemoveBudget = (category: string) => {
    const updated = { ...budgets };
    delete updated[category];
    onBudgetsUpdate(updated);
    BudgetStorage.saveBudgets(updated);
  };

  return (
    <div className="budget-manager">
      <h4>Budget Manager</h4>
      <p className="small-muted">Set monthly budgets for categories and get alerts when you're approaching limits.</p>

      {Object.keys(budgets).length === 0 ? (
        <p className="small-muted">No budgets set. Add one below.</p>
      ) : (
        <div className="budget-manager__list">
          {Object.entries(budgets).map(([category, amount]) => {
            const alert = alerts.find(a => a.category === category);
            return (
              <div key={category} className="budget-manager__item">
                <div className="budget-manager__category">
                  <span>{category}</span>
                  {alert && (
                    <span className={`budget-manager__status budget-manager__status--${alert.status}`}>
                      {alert.status === 'exceeded' ? 'Exceeded' : 'Warning'}
                    </span>
                  )}
                </div>
                <div className="budget-manager__controls">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => handleUpdateBudget(category, parseFloat(e.target.value) || 0)}
                    className="budget-manager__input"
                  />
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleRemoveBudget(category)}
                  >
                    Remove
                  </button>
                </div>
                {alert && (
                  <div className={`budget-manager__alert budget-manager__alert--${alert.status}`}>
                    Spent: {formatCurrency(alert.spent)} / {formatCurrency(alert.budget)} ({alert.percentage.toFixed(1)}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="budget-manager__add">
        <select
          value={newCategory}
          onChange={(e) => {
            if (e.target.value) {
              handleAddBudget(e.target.value);
            } else {
              setNewCategory('');
            }
          }}
          className="budget-manager__select"
        >
          <option value="">Add budget for category</option>
          {DEFAULT_CATEGORIES.filter(c => !budgets[c]).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {alerts.length > 0 && (
        <div className="budget-manager__alerts">
          <h5>Budget Alerts</h5>
          <ul>
            {alerts.map((alert, index) => (
              <li key={index} className={`budget-manager__alert-item budget-manager__alert-item--${alert.status}`}>
                {alert.category}: {formatCurrency(alert.spent)} / {formatCurrency(alert.budget)} ({alert.percentage.toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BudgetManager;

