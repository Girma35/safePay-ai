# SafePay AI - AI Functionalities Documentation

## Overview
SafePay AI implements **100% on-device AI** - all processing happens locally on your device. No data is sent to external servers or APIs.

## Total AI Functionalities: **5 Core Features**

### 1. **AI Expense Categorization** 🤖
**Location**: `src/client/services/ai.ts`, `src/client/lib/classifier.ts`

**Features**:
- **Automatic category suggestion** based on transaction notes
- **Machine learning classifier** that learns from your past transactions
- **Enhanced heuristics** with 30+ keyword patterns for common categories
- **Confidence scoring** for category suggestions
- **Continuous learning** - improves accuracy over time as you categorize transactions

**How it works**:
- Tokenizes transaction notes into keywords
- Matches keywords against learned patterns
- Uses heuristics for common patterns (e.g., "coffee" → Food, "uber" → Transport)
- Calculates confidence scores based on match strength
- Trains the classifier with each transaction you add

**Categories Supported**:
- Food, Transport, Rent, Salary, Utilities, Entertainment, Shopping, Healthcare, Education, Other

---

### 2. **AI Financial Insights Generation** 💡
**Location**: `src/client/services/ai.ts` → `generateInsights()`

**Features**:
- **Net balance analysis** - calculates income vs expenses
- **Top spending category identification** - finds your biggest expense category
- **Monthly comparison** - compares last 30 days vs previous 30 days
- **Spending trend detection** - identifies increases/decreases in spending
- **Savings opportunity suggestions** - recommends potential savings based on spending patterns

**Insights Generated**:
- Positive/negative balance alerts
- Category spending percentages
- Month-over-month spending changes
- Daily expense averages
- Potential monthly savings calculations

---

### 3. **AI Fraud & Anomaly Detection** 🚨
**Location**: `src/client/services/anomaly.ts` → `detectAnomalies()`

**Features**:
- **Duplicate transaction detection** - finds similar transactions within 1 hour
- **Unusually high amount alerts** - flags expenses 3x+ above average
- **Unusual timing detection** - identifies large transactions at odd hours (2-5 AM)
- **Rapid succession detection** - flags 3+ transactions within 30 minutes
- **Severity classification** - categorizes anomalies as low/medium/high risk

**Detection Types**:
1. **Duplicate Detection**: Same amount + note + category within 1 hour
2. **High Amount Detection**: Expenses > 3x average and > $100
3. **Unusual Time Detection**: Large transactions (>$50) between 2-5 AM
4. **Rapid Succession Detection**: 3+ expenses totaling >$100 within 30 minutes

**Anomaly Summary**:
- Total count of anomalies
- Breakdown by severity (low/medium/high)
- Breakdown by type (duplicate/high-amount/unusual-time/rapid-succession)

---

### 4. **AI Budget Recommendations** 💰
**Location**: `src/client/utils/budget.ts` → `getBudgetRecommendations()`

**Features**:
- **Budget status calculation** - tracks spending vs budget limits
- **Budget alerts** - warns when approaching or exceeding budgets
- **Spending recommendations** - suggests budget adjustments based on patterns
- **Category-specific insights** - provides tips for each spending category

**Recommendations Include**:
- Budget adjustment suggestions
- Spending reduction tips
- Category-specific advice
- Monthly budget optimization

---

### 5. **AI Pattern Recognition & Learning** 🧠
**Location**: `src/client/lib/classifier.ts`, `src/client/services/ai.ts`

**Features**:
- **Keyword pattern matching** - recognizes 30+ common spending patterns
- **Adaptive learning** - improves suggestions based on your transaction history
- **Multi-factor analysis** - considers note text, amount, and historical patterns
- **Confidence scoring** - provides reliability metrics for suggestions

**Pattern Recognition**:
- Food patterns: coffee, restaurant, grocery, etc.
- Transport patterns: uber, gas, parking, etc.
- Income patterns: salary, payment, deposit, etc.
- Shopping patterns: amazon, purchase, retail, etc.
- And 20+ more pattern categories

---

## Technical Details

### All Processing is On-Device
- ✅ No external API calls
- ✅ No data transmission to servers
- ✅ No cloud processing
- ✅ Works completely offline
- ✅ Privacy-first design

### Machine Learning Approach
- **Type**: Supervised learning with keyword-based classification
- **Training**: Incremental learning from user transactions
- **Storage**: Classifier data stored locally (optionally encrypted)
- **Performance**: Real-time processing, no delays

### Data Privacy
- All AI processing happens in your browser
- Classifier data stored in localStorage
- Optional wallet-backed encryption for classifier data
- Zero external dependencies for AI features

---

## Usage Examples

### 1. Automatic Categorization
```typescript
// When adding a transaction with note "Starbucks coffee"
// AI automatically suggests: Food category (95% confidence)
```

### 2. Anomaly Detection
```typescript
// Detects: "Duplicate transaction found within 1 hour"
// Severity: Medium
// Action: User can review and confirm
```

### 3. Financial Insights
```typescript
// Generates: "Your top spending category is Food (35% of expenses)"
// "Your spending increased by 15% compared to previous 30 days"
```

---

## Future AI Enhancements (Potential)
- Predictive spending forecasts
- Recurring transaction detection
- Bill reminder predictions
- Advanced pattern recognition
- Multi-currency analysis
- Receipt OCR integration

---

## Summary

**Total AI Functionalities: 5**
1. ✅ Expense Categorization (ML-based)
2. ✅ Financial Insights Generation
3. ✅ Fraud & Anomaly Detection
4. ✅ Budget Recommendations
5. ✅ Pattern Recognition & Learning

All features are **100% on-device** and **privacy-preserving**.





