/**
 * Add Transaction Page
 * Page for adding new transactions
 */

import React, { useState, useEffect } from 'react';
import Transactions from './Transactions';
import { DEFAULT_CATEGORIES } from '../services/ai';

const RECENT_CATEGORIES_KEY = 'safepay_recent_categories';

const AddTransaction: React.FC = () => {
  const [externalCategory, setExternalCategory] = useState<string | null>(null);
  const [externalAmount, setExternalAmount] = useState<string>('');
  const [recentCategories, setRecentCategories] = useState<string[]>([]);

  // Category icons mapping
  const categoryIcons: Record<string, string> = {
    'Food': '🍽️',
    'Transport': '🚗',
    'Rent': '🏠',
    'Salary': '💰',
    'Utilities': '⚡',
    'Entertainment': '🎬',
    'Shopping': '🛍️',
    'Healthcare': '🏥',
    'Education': '📚',
    'Other': '📦',
  };

  // Quick amount presets
  const quickAmounts = [5, 10, 20, 50, 100];

  // Load recent categories on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_CATEGORIES_KEY);
      if (stored) {
        setRecentCategories(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent categories:', error);
    }
  }, []);

  // Save recent category when selected
  const updateRecentCategories = (category: string) => {
    const updated = [category, ...recentCategories.filter(c => c !== category)].slice(0, 5);
    setRecentCategories(updated);
    try {
      localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent categories:', error);
    }
  };

  const handleCategoryClick = (category: string) => {
    setExternalCategory(category);
    updateRecentCategories(category);
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCategoryClick(category);
    }
  };

  const handleAmountClick = (amount: number) => {
    setExternalAmount(amount.toString());
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent, amount: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAmountClick(amount);
    }
  };

  return (
    <div className="sp-page">
      <header className="header">
        <div>
          <h1 className="title">Add Transaction</h1>
          <p className="subtitle">Record income or expenses with AI-powered categorization</p>
        </div>
      </header>

      <div className="add-transaction-layout">
        <main className="add-transaction-main">
          <div className="card">
            <Transactions showAddForm={true} autoFocus={true} externalCategory={externalCategory} externalAmount={externalAmount} />
          </div>
        </main>

        <aside className="add-transaction-sidebar">
          {/* Welcome message for first-time users */}
          {recentCategories.length === 0 && (
            <div className="card sidebar-section welcome-card">
              <div className="welcome-content">
                <div className="welcome-icon">🎉</div>
                <h4>Welcome to SafePay AI!</h4>
                <p className="small-muted">
                  Start by selecting a category below or let our AI suggest one based on your transaction notes.
                </p>
              </div>
            </div>
          )}

          {/* Recent Categories */}
          {recentCategories.length > 0 && (
            <div className="card sidebar-section">
              <div className="section-header">
                <h4>🔄 Recent</h4>
                <span className="section-badge">{recentCategories.length}</span>
              </div>
              <div className="quick-categories-grid">
                {recentCategories.map((category) => (
                  <button
                    key={`recent-${category}`}
                    className={`quick-category-btn recent ${externalCategory === category ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(category)}
                    onKeyDown={(e) => handleKeyDown(e, category)}
                    aria-label={`Select recent category ${category}`}
                    aria-pressed={externalCategory === category}
                    tabIndex={0}
                  >
                    <span className="category-icon">{categoryIcons[category] || '📦'}</span>
                    <span className="category-label">{category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card sidebar-section">
            <div className="section-header">
              <h4>📂 Categories</h4>
            </div>
            <div className="quick-categories-grid">
              {DEFAULT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`quick-category-btn ${externalCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category)}
                  onKeyDown={(e) => handleKeyDown(e, category)}
                  aria-label={`Select ${category} category`}
                  aria-pressed={externalCategory === category}
                  tabIndex={0}
                >
                  <span className="category-icon">{categoryIcons[category] || '📦'}</span>
                  <span className="category-label">{category}</span>
                </button>
              ))}
            </div>
            <div className="section-footer">
              <p className="small-muted">
                Tap a category to pre-fill the form. Start typing in the Note field to get AI category suggestions.
              </p>
            </div>
          </div>

          <div className="card sidebar-section">
            <div className="section-header">
              <h4>💰 Quick Amounts</h4>
            </div>
            <div className="quick-amounts-grid">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  className="quick-amount-btn"
                  onClick={() => handleAmountClick(amount)}
                  onKeyDown={(e) => handleAmountKeyDown(e, amount)}
                  aria-label={`Set amount to ${amount}`}
                  tabIndex={0}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <div className="section-footer">
              <p className="small-muted">
                Tap to quickly set common amounts.
              </p>
            </div>
          </div>

          <div className="card sidebar-section">
            <div className="section-header">
              <h4>💡 Tips</h4>
            </div>
            <ul className="tips-list">
              <li>Use descriptive notes for better AI categorization</li>
              <li>The classifier learns from your transactions over time</li>
              <li>Enable wallet-backed encryption for extra security</li>
              <li>Export backups regularly to keep your data safe</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AddTransaction;
