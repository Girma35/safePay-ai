/**
 * Tax Season Assistant
 * Automatically identifies tax-deductible expenses and generates reports
 * On-device analysis with predefined tax categories and rules
 * Helps users maximize deductions and prepare for tax season
 */

import { Transaction } from '../../types';

export interface TaxCategory {
  id: string;
  name: string;
  description: string;
  deductible: boolean;
  commonExamples: string[];
  taxRules: string[];
  maxDeduction?: number;
  requiresDocumentation: boolean;
}

export interface TaxDeduction {
  transaction: Transaction;
  category: TaxCategory;
  confidence: number;
  potentialSavings: number;
  reasoning: string;
  documentationNeeded: string[];
}

export interface TaxReport {
  taxYear: number;
  totalIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  potentialTaxSavings: number;
  deductions: TaxDeduction[];
  summary: {
    byCategory: Record<string, number>;
    highConfidenceDeductions: number;
    documentationNeeded: number;
  };
  recommendations: string[];
}

/**
 * Predefined tax categories and deduction rules
 */
export const TAX_CATEGORIES: TaxCategory[] = [
  {
    id: 'home_office',
    name: 'Home Office',
    description: 'Expenses related to dedicated home office space',
    deductible: true,
    commonExamples: ['internet', 'electricity', 'repairs', 'furniture'],
    taxRules: ['Must be exclusively used for business', 'Regular and exclusive use'],
    requiresDocumentation: true,
  },
  {
    id: 'business_meals',
    name: 'Business Meals & Entertainment',
    description: 'Meals and entertainment for business purposes',
    deductible: true,
    commonExamples: ['restaurant', 'coffee', 'lunch meeting', 'client dinner'],
    taxRules: ['50% deductible', 'Must be business-related', 'Keep receipts'],
    maxDeduction: 0.5, // 50%
    requiresDocumentation: true,
  },
  {
    id: 'travel',
    name: 'Business Travel',
    description: 'Travel expenses for business purposes',
    deductible: true,
    commonExamples: ['flight', 'hotel', 'taxi', 'mileage', 'parking'],
    taxRules: ['Away from home overnight', 'Business purpose primary'],
    requiresDocumentation: true,
  },
  {
    id: 'vehicle',
    name: 'Vehicle Expenses',
    description: 'Business use of personal vehicle',
    deductible: true,
    commonExamples: ['gas', 'maintenance', 'insurance', 'parking'],
    taxRules: ['Standard mileage rate or actual expenses', 'Business use percentage'],
    requiresDocumentation: true,
  },
  {
    id: 'supplies',
    name: 'Office Supplies',
    description: 'Office and business supplies',
    deductible: true,
    commonExamples: ['printer', 'paper', 'ink', 'software', 'computer'],
    taxRules: ['Ordinary and necessary', 'Business use'],
    requiresDocumentation: false,
  },
  {
    id: 'professional_fees',
    name: 'Professional Fees',
    description: 'Professional services and fees',
    deductible: true,
    commonExamples: ['accounting', 'legal', 'consulting', 'training'],
    taxRules: ['Ordinary and necessary business expenses'],
    requiresDocumentation: true,
  },
  {
    id: 'health_insurance',
    name: 'Health Insurance',
    description: 'Self-employed health insurance premiums',
    deductible: true,
    commonExamples: ['insurance premium', 'medical insurance'],
    taxRules: ['Self-employed individuals only', 'Above-the-line deduction'],
    requiresDocumentation: true,
  },
  {
    id: 'retirement',
    name: 'Retirement Contributions',
    description: 'SEP IRA or Solo 401(k) contributions',
    deductible: true,
    commonExamples: ['ira', '401k', 'retirement'],
    taxRules: ['Self-employed individuals', 'Contribution limits apply'],
    requiresDocumentation: true,
  },
  {
    id: 'education',
    name: 'Education & Training',
    description: 'Work-related education expenses',
    deductible: true,
    commonExamples: ['course', 'workshop', 'conference', 'certification'],
    taxRules: ['Maintains or improves skills', 'Required by employer'],
    requiresDocumentation: true,
  },
  {
    id: 'charitable',
    name: 'Charitable Contributions',
    description: 'Cash and non-cash charitable donations',
    deductible: true,
    commonExamples: ['donation', 'charity', 'nonprofit'],
    taxRules: ['To qualified organizations', 'Cash donations limited to 60% AGI'],
    requiresDocumentation: true,
  },
];

/**
 * Analyze transaction for potential tax deductions
 */
export function analyzeTransactionForTax(
  transaction: Transaction,
  taxYear: number = new Date().getFullYear()
): TaxDeduction | null {
  if (transaction.type !== 'expense') {
    return null; // Only analyze expenses
  }

  const amount = Math.abs(transaction.amount);
  const note = (transaction.note || '').toLowerCase();
  const category = transaction.category.toLowerCase();

  let bestMatch: TaxCategory | null = null;
  let highestConfidence = 0;
  let reasoning = '';

  // Analyze against each tax category
  for (const taxCategory of TAX_CATEGORIES) {
    let confidence = 0;
    const reasons: string[] = [];

    // Check category match
    if (category.includes(taxCategory.id) ||
        taxCategory.commonExamples.some(example => category.includes(example))) {
      confidence += 0.4;
      reasons.push(`Category matches: ${category}`);
    }

    // Check note/description match
    if (taxCategory.commonExamples.some(example => note.includes(example))) {
      confidence += 0.4;
      reasons.push(`Description contains: ${taxCategory.commonExamples.find(ex => note.includes(ex))}`);
    }

    // Check for business context clues
    if (note.includes('business') || note.includes('work') || note.includes('client')) {
      confidence += 0.2;
      reasons.push('Contains business context');
    }

    // Merchant-based heuristics
    const merchantClues: Record<string, string> = {
      'uber': 'travel',
      'lyft': 'travel',
      'airbnb': 'travel',
      'expedia': 'travel',
      'amazon': 'supplies',
      'staples': 'supplies',
      'office depot': 'supplies',
      'legalzoom': 'professional_fees',
      'constant contact': 'professional_fees',
    };

    for (const [merchant, taxCat] of Object.entries(merchantClues)) {
      if (note.includes(merchant)) {
        if (taxCat === taxCategory.id) {
          confidence += 0.3;
          reasons.push(`Merchant suggests ${taxCategory.name}`);
        }
      }
    }

    // Amount-based heuristics
    if (amount > 500 && ['travel', 'vehicle'].includes(taxCategory.id)) {
      confidence += 0.1;
      reasons.push('Amount suggests business expense');
    }

    if (confidence > highestConfidence && confidence > 0.3) {
      highestConfidence = confidence;
      bestMatch = taxCategory;
      reasoning = reasons.join(', ');
    }
  }

  if (!bestMatch || highestConfidence < 0.3) {
    return null;
  }

  // Calculate potential savings
  const deductionLimit = bestMatch.maxDeduction || 1;
  const deductibleAmount = amount * deductionLimit;
  const estimatedTaxRate = 0.25; // Conservative estimate
  const potentialSavings = deductibleAmount * estimatedTaxRate;

  // Documentation requirements
  const documentationNeeded = [];
  if (bestMatch.requiresDocumentation) {
    documentationNeeded.push('Receipt or invoice');
    if (bestMatch.id === 'travel') {
      documentationNeeded.push('Travel purpose documentation');
    }
    if (bestMatch.id === 'home_office') {
      documentationNeeded.push('Home office measurement documentation');
    }
  }

  return {
    transaction,
    category: bestMatch,
    confidence: Math.min(highestConfidence, 1),
    potentialSavings,
    reasoning,
    documentationNeeded,
  };
}

/**
 * Generate comprehensive tax report
 */
export function generateTaxReport(
  transactions: Transaction[],
  taxYear: number = new Date().getFullYear(),
  estimatedTaxRate: number = 0.25
): TaxReport {
  // Filter transactions for the tax year
  const taxYearTransactions = transactions.filter(t => {
    const transactionYear = new Date(t.timestamp).getFullYear();
    return transactionYear === taxYear;
  });

  // Calculate total income
  const totalIncome = taxYearTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Analyze deductions
  const deductions: TaxDeduction[] = [];
  taxYearTransactions.forEach(transaction => {
    const deduction = analyzeTransactionForTax(transaction, taxYear);
    if (deduction) {
      deductions.push(deduction);
    }
  });

  // Calculate totals
  const totalDeductions = deductions.reduce((sum, d) => {
    const deductionLimit = d.category.maxDeduction || 1;
    return sum + (Math.abs(d.transaction.amount) * deductionLimit);
  }, 0);

  const taxableIncome = Math.max(0, totalIncome - totalDeductions);
  const potentialTaxSavings = totalDeductions * estimatedTaxRate;

  // Summary statistics
  const byCategory: Record<string, number> = {};
  deductions.forEach(deduction => {
    const deductionLimit = deduction.category.maxDeduction || 1;
    const amount = Math.abs(deduction.transaction.amount) * deductionLimit;
    byCategory[deduction.category.name] = (byCategory[deduction.category.name] || 0) + amount;
  });

  const highConfidenceDeductions = deductions.filter(d => d.confidence > 0.7).length;
  const documentationNeeded = deductions
    .filter(d => d.documentationNeeded.length > 0)
    .length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (deductions.length === 0) {
    recommendations.push('No potential tax deductions identified. Consider reviewing transactions manually.');
  } else {
    recommendations.push(`Found ${deductions.length} potential tax deductions totaling $${totalDeductions.toFixed(2)}`);

    if (highConfidenceDeductions < deductions.length * 0.5) {
      recommendations.push('Many deductions have low confidence. Consider adding more descriptive transaction notes.');
    }

    if (documentationNeeded > 0) {
      recommendations.push(`${documentationNeeded} deductions require documentation. Keep receipts organized.`);
    }

    // Category-specific recommendations
    const travelDeductions = deductions.filter(d => d.category.id === 'travel');
    if (travelDeductions.length > 0) {
      recommendations.push('Travel deductions found - ensure you have records of business purpose for each trip.');
    }

    const homeOfficeDeductions = deductions.filter(d => d.category.id === 'home_office');
    if (homeOfficeDeductions.length > 0) {
      recommendations.push('Home office deductions require exclusive and regular business use. Document square footage calculations.');
    }

    // Savings recommendations
    if (potentialTaxSavings > 1000) {
      recommendations.push(`Potential tax savings of $${potentialTaxSavings.toFixed(2)} identified. Consider consulting a tax professional.`);
    }
  }

  return {
    taxYear,
    totalIncome,
    totalDeductions,
    taxableIncome,
    potentialTaxSavings,
    deductions,
    summary: {
      byCategory,
      highConfidenceDeductions,
      documentationNeeded,
    },
    recommendations,
  };
}

/**
 * Export tax report to CSV format
 */
export function exportTaxReportToCSV(report: TaxReport): string {
  const headers = [
    'Date',
    'Description',
    'Category',
    'Amount',
    'Deductible Amount',
    'Tax Category',
    'Confidence',
    'Documentation Needed',
    'Potential Savings'
  ];

  const rows = report.deductions.map(deduction => {
    const deductionLimit = deduction.category.maxDeduction || 1;
    const deductibleAmount = Math.abs(deduction.transaction.amount) * deductionLimit;
    const potentialSavings = deductibleAmount * (report.potentialTaxSavings / report.totalDeductions);

    return [
      new Date(deduction.transaction.timestamp).toLocaleDateString(),
      deduction.transaction.note || '',
      deduction.transaction.category,
      Math.abs(deduction.transaction.amount).toFixed(2),
      deductibleAmount.toFixed(2),
      deduction.category.name,
      (deduction.confidence * 100).toFixed(1) + '%',
      deduction.documentationNeeded.join('; '),
      potentialSavings.toFixed(2)
    ];
  });

  // Add summary row
  rows.push([
    'SUMMARY',
    '',
    '',
    '',
    report.totalDeductions.toFixed(2),
    'Total Deductions',
    '',
    '',
    report.potentialTaxSavings.toFixed(2)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Export tax report to PDF-friendly format
 */
export function exportTaxReportToText(report: TaxReport): string {
  let text = `TAX DEDUCTION REPORT - ${report.taxYear}\n`;
  text += '=' .repeat(50) + '\n\n';

  text += `Total Income: $${report.totalIncome.toFixed(2)}\n`;
  text += `Total Deductions: $${report.totalDeductions.toFixed(2)}\n`;
  text += `Taxable Income: $${report.taxableIncome.toFixed(2)}\n`;
  text += `Potential Tax Savings: $${report.potentialTaxSavings.toFixed(2)}\n\n`;

  text += 'DEDUCTIONS BY CATEGORY:\n';
  text += '-'.repeat(30) + '\n';
  Object.entries(report.summary.byCategory).forEach(([category, amount]) => {
    text += `${category}: $${amount.toFixed(2)}\n`;
  });

  text += '\nDETAILED DEDUCTIONS:\n';
  text += '-'.repeat(30) + '\n';

  report.deductions.forEach((deduction, index) => {
    const deductionLimit = deduction.category.maxDeduction || 1;
    const deductibleAmount = Math.abs(deduction.transaction.amount) * deductionLimit;

    text += `${index + 1}. ${new Date(deduction.transaction.timestamp).toLocaleDateString()}\n`;
    text += `   ${deduction.transaction.note || 'No description'}\n`;
    text += `   Category: ${deduction.category.name}\n`;
    text += `   Amount: $${Math.abs(deduction.transaction.amount).toFixed(2)}\n`;
    text += `   Deductible: $${deductibleAmount.toFixed(2)}\n`;
    text += `   Confidence: ${(deduction.confidence * 100).toFixed(1)}%\n`;
    if (deduction.documentationNeeded.length > 0) {
      text += `   Documentation: ${deduction.documentationNeeded.join(', ')}\n`;
    }
    text += '\n';
  });

  text += 'RECOMMENDATIONS:\n';
  text += '-'.repeat(30) + '\n';
  report.recommendations.forEach(rec => {
    text += `• ${rec}\n`;
  });

  return text;
}

/**
 * Get tax season reminders
 */
export function getTaxSeasonReminders(currentDate: Date = new Date()): string[] {
  const reminders: string[] = [];
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Tax deadline is typically April 15th
  const taxDeadline = new Date(currentYear, 3, 15); // April 15
  const daysUntilDeadline = Math.ceil((taxDeadline.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));

  if (daysUntilDeadline > 0 && daysUntilDeadline <= 60) {
    reminders.push(`${daysUntilDeadline} days until tax deadline. Start organizing receipts and documentation.`);
  }

  // Quarterly reminders for self-employed
  const quarterlyDeadlines = [
    new Date(currentYear, 3, 15), // Q1: April 15
    new Date(currentYear, 5, 15), // Q2: June 15
    new Date(currentYear, 8, 15), // Q3: September 15
    new Date(currentYear, 11, 15), // Q4: December 15
  ];

  const nextQuarterlyDeadline = quarterlyDeadlines.find(date => date > currentDate);
  if (nextQuarterlyDeadline) {
    const daysUntilQuarterly = Math.ceil((nextQuarterlyDeadline.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysUntilQuarterly <= 30) {
      reminders.push(`${daysUntilQuarterly} days until quarterly tax payment deadline.`);
    }
  }

  // General reminders based on month
  if (currentMonth >= 0 && currentMonth <= 2) { // Jan-Mar
    reminders.push('Tax season approaching. Review 1099s and W-2s as they arrive.');
  }

  if (currentMonth === 3) { // April
    reminders.push('Tax deadline approaching. Ensure all documentation is organized.');
  }

  return reminders;
}

/**
 * Validate tax deduction
 */
export function validateTaxDeduction(deduction: TaxDeduction): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Confidence check
  if (deduction.confidence < 0.5) {
    warnings.push('Low confidence deduction - consider manual verification');
  }

  // Documentation check
  if (deduction.documentationNeeded.length > 0) {
    warnings.push('Documentation required for this deduction');
    suggestions.push('Keep original receipts for at least 3 years');
  }

  // Amount validation
  const amount = Math.abs(deduction.transaction.amount);
  if (amount > 10000 && deduction.category.id === 'supplies') {
    warnings.push('Large supply expense - verify business use');
  }

  // Category-specific validations
  if (deduction.category.id === 'business_meals' && amount > 500) {
    warnings.push('Large meal expense - ensure 50% limit and business purpose');
  }

  if (deduction.category.id === 'travel' && amount > 2500) {
    suggestions.push('Large travel expense may require detailed business purpose documentation');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
}