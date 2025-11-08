/**
 * Natural Language Transaction Parser
 * Parses natural language input into structured transaction data
 * On-device processing - no external APIs
 */

import { Transaction } from '../../types';

export interface ParsedTransaction {
  amount?: number;
  category?: string;
  merchant?: string;
  note?: string;
  date?: Date;
  type: 'income' | 'expense';
  confidence: number;
  rawInput: string;
}

export interface ParseResult {
  success: boolean;
  transaction?: ParsedTransaction;
  suggestions?: string[];
  error?: string;
}

/**
 * Currency patterns for amount extraction
 */
const CURRENCY_PATTERNS = [
  /\$\s*(\d+(?:\.\d{2})?)/g, // $12.50
  /(\d+(?:\.\d{2})?)\s*dollars?/gi, // 12 dollars
  /(\d+(?:\.\d{2})?)\s*USD/gi, // 12 USD
  /(\d+(?:\.\d{2})?)\s*bucks/gi, // 12 bucks
];

/**
 * Time expressions for date parsing
 */
const TIME_EXPRESSIONS = {
  today: 0,
  yesterday: -1,
  'last night': -1,
  'this morning': 0,
  'yesterday morning': -1,
  'yesterday evening': -1,
  'last week': -7,
  'this week': 0,
  'last month': -30,
  'this month': 0,
};

/**
 * Merchant and category patterns
 */
const MERCHANT_PATTERNS = [
  // Food & Dining
  { regex: /\b(starbucks|mcdonalds|burger king|kfc|subway|pizza hut|dominos|chipotle|taco bell|wendys|popeyes)\b/gi, category: 'Food', merchant: '$1' },
  { regex: /\b(uber eats|doordash|grubhub|postmates|seamless)\b/gi, category: 'Food', merchant: '$1' },
  { regex: /\b(grocery|supermarket|whole foods|trader joes|costco|walmart|target)\b/gi, category: 'Shopping', merchant: '$1' },

  // Transport
  { regex: /\b(uber|lyft|taxi|cab|ride.?share)\b/gi, category: 'Transport', merchant: '$1' },
  { regex: /\b(metro|subway|bus|train|bart|mta)\b/gi, category: 'Transport', merchant: '$1' },
  { regex: /\b(gas|petrol|shell|chevron|exxon|bp)\b/gi, category: 'Transport', merchant: '$1' },

  // Entertainment
  { regex: /\b(netflix|spotify|hulu|disney|amazon prime|hbo)\b/gi, category: 'Entertainment', merchant: '$1' },
  { regex: /\b(movie|cinema|theater|concert|show)\b/gi, category: 'Entertainment', merchant: 'Movie/Concert' },

  // Utilities
  { regex: /\b(electric|power|pg&e|pge|sce|sdge)\b/gi, category: 'Utilities', merchant: '$1' },
  { regex: /\b(internet|wifi|comcast|xfinity|att|verizon)\b/gi, category: 'Utilities', merchant: '$1' },
  { regex: /\b(phone|mobile|tmobile|at&t|sprint)\b/gi, category: 'Utilities', merchant: '$1' },

  // Healthcare
  { regex: /\b(pharmacy|walgreens|cvs|rite aid|pharm)\b/gi, category: 'Healthcare', merchant: '$1' },
  { regex: /\b(doctor|dentist|hospital|clinic|medical)\b/gi, category: 'Healthcare', merchant: 'Medical' },

  // Income
  { regex: /\b(salary|payroll|paycheck|bonus|freelance)\b/gi, category: 'Salary', merchant: 'Income' },
];

/**
 * Action verbs that indicate transaction type
 */
const ACTION_VERBS = {
  expense: /\b(paid|bought|purchased|spent|charged|billed|owed|gave|donated)\b/gi,
  income: /\b(received|earned|got|made|sold|income|deposit|refund)\b/gi,
};

/**
 * Extract amount from text
 */
function extractAmount(text: string): number | null {
  for (const pattern of CURRENCY_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

/**
 * Extract date from time expressions
 */
function extractDate(text: string): Date | null {
  const textLower = text.toLowerCase();

  for (const [expression, daysOffset] of Object.entries(TIME_EXPRESSIONS)) {
    if (textLower.includes(expression)) {
      const date = new Date();
      date.setDate(date.getDate() + daysOffset);
      return date;
    }
  }

  // Try to extract explicit dates
  const datePatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})\b/g, // MM/DD or DD/MM
    /\b(\w{3})\s+(\d{1,2})\b/gi, // Mon DD
  ];

  for (const pattern of datePatterns) {
    const match = pattern.exec(text);
    if (match) {
      try {
        const date = new Date(match[0] + (match[0].includes('/') ? '' : ` ${new Date().getFullYear()}`));
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Extract merchant and category from text
 */
function extractMerchantAndCategory(text: string): { merchant?: string; category?: string } {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (match) {
      const merchant = pattern.merchant.replace('$1', match[1] || match[0]);
      return {
        merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1).toLowerCase(),
        category: pattern.category,
      };
    }
  }

  // Try to extract any capitalized words as potential merchant names
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g);
  if (capitalizedWords && capitalizedWords.length > 0) {
    return {
      merchant: capitalizedWords[0],
      category: 'Other',
    };
  }

  return {};
}

/**
 * Determine transaction type from text
 */
function determineTransactionType(text: string): 'income' | 'expense' {
  if (ACTION_VERBS.income.test(text)) {
    return 'income';
  }
  if (ACTION_VERBS.expense.test(text)) {
    return 'expense';
  }

  // Default to expense if no clear indication
  return 'expense';
}

/**
 * Extract additional notes/context from text
 */
function extractNotes(text: string, amount: number | null, merchant: string | null): string {
  let notes = text;

  // Remove amount mentions
  notes = notes.replace(CURRENCY_PATTERNS[0], '');
  notes = notes.replace(CURRENCY_PATTERNS[1], '');
  notes = notes.replace(CURRENCY_PATTERNS[2], '');
  notes = notes.replace(CURRENCY_PATTERNS[3], '');

  // Remove time expressions
  Object.keys(TIME_EXPRESSIONS).forEach(expr => {
    notes = notes.replace(new RegExp(`\\b${expr}\\b`, 'gi'), '');
  });

  // Remove action verbs
  notes = notes.replace(ACTION_VERBS.expense, '');
  notes = notes.replace(ACTION_VERBS.income, '');

  // Clean up extra spaces and punctuation
  notes = notes.replace(/\s+/g, ' ').trim();
  notes = notes.replace(/^[,.\s]+|[,.\s]+$/g, '');

  // If notes are too short or just the merchant name, create a better description
  if (notes.length < 5 || (merchant && notes.toLowerCase().includes(merchant.toLowerCase()))) {
    const type = determineTransactionType(text);
    const action = type === 'income' ? 'Received' : 'Paid';
    notes = merchant ? `${action} at ${merchant}` : `${action} ${amount ? `$${amount}` : ''}`;
  }

  return notes;
}

/**
 * Calculate confidence score for parsing
 */
function calculateConfidence(parsed: ParsedTransaction): number {
  let confidence = 0.5; // Base confidence

  if (parsed.amount !== undefined) confidence += 0.3;
  if (parsed.category) confidence += 0.2;
  if (parsed.merchant) confidence += 0.2;
  if (parsed.date) confidence += 0.1;

  // Boost confidence for clear patterns
  if (parsed.rawInput.match(/\$\d+/)) confidence += 0.1;
  if (ACTION_VERBS.expense.test(parsed.rawInput) || ACTION_VERBS.income.test(parsed.rawInput)) confidence += 0.1;

  return Math.min(1, confidence);
}

/**
 * Main parsing function
 */
export function parseTransactionInput(input: string): ParseResult {
  if (!input.trim()) {
    return {
      success: false,
      error: 'Empty input',
    };
  }

  const text = input.trim();
  const transactionType = determineTransactionType(text);

  // Extract components
  const amount = extractAmount(text);
  const date = extractDate(text);
  const { merchant, category } = extractMerchantAndCategory(text);
  const note = extractNotes(text, amount, merchant || null);

  // Validate minimum requirements
  if (amount === null) {
    return {
      success: false,
      error: 'Could not extract amount from input. Try including the dollar amount like "$12.50"',
      suggestions: [
        'Try: "Paid $12.50 for lunch"',
        'Try: "Received $100 salary"',
        'Try: "Spent 25 dollars on gas"',
      ],
    };
  }

  const parsedTransaction: ParsedTransaction = {
    amount: transactionType === 'income' ? Math.abs(amount) : -Math.abs(amount),
    category: category || 'Other',
    merchant: merchant || undefined,
    note,
    date: date || new Date(),
    type: transactionType,
    confidence: 0, // Will be calculated
    rawInput: text,
  };

  parsedTransaction.confidence = calculateConfidence(parsedTransaction);

  return {
    success: true,
    transaction: parsedTransaction,
  };
}

/**
 * Convert parsed transaction to full Transaction object
 */
export function parsedToTransaction(parsed: ParsedTransaction): Omit<Transaction, 'id'> {
  return {
    amount: parsed.amount!,
    category: parsed.category!,
    note: parsed.note!,
    timestamp: parsed.date!.toISOString(),
    type: parsed.type,
  };
}

/**
 * Get parsing examples and tips
 */
export function getParsingExamples(): string[] {
  return [
    'Paid $12.50 for Uber last night',
    'Received $500 salary today',
    'Spent 25 dollars on groceries',
    'Bought coffee at Starbucks this morning',
    'Got $100 refund from Amazon',
    'Charged $45 for dinner at Chipotle',
    'Paid electric bill $120 yesterday',
  ];
}

/**
 * Validate and improve parsed transaction
 */
export function validateAndImprove(parsed: ParsedTransaction): ParsedTransaction {
  const improved = { ...parsed };

  // Improve category based on merchant
  if (!improved.category || improved.category === 'Other') {
    if (improved.merchant) {
      const merchantLower = improved.merchant.toLowerCase();
      if (merchantLower.includes('coffee') || merchantLower.includes('starbucks')) {
        improved.category = 'Food';
      } else if (merchantLower.includes('uber') || merchantLower.includes('lyft')) {
        improved.category = 'Transport';
      } else if (merchantLower.includes('netflix') || merchantLower.includes('spotify')) {
        improved.category = 'Entertainment';
      }
    }
  }

  // Improve note if it's too generic
  if (improved.note && improved.note.length < 10) {
    const type = improved.type === 'income' ? 'Received' : 'Paid';
    improved.note = `${type} ${improved.merchant ? `at ${improved.merchant}` : ''} - ${improved.note}`;
  }

  return improved;
}