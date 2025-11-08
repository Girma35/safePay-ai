/**
 * On-device classifier for expense categorization
 * No external API calls - all processing is done locally
 */

export type Classifier = {
  keywords: Record<string, Record<string, number>>;
};

export const defaultClassifier = (): Classifier => ({ keywords: {} });

/**
 * Tokenize a string into words
 */
export function tokenize(s?: string): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Score categories based on classifier keywords
 */
export function scoreByClassifier(cls: Classifier, tokens: string[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const t of tokens) {
    const map = cls.keywords[t];
    if (!map) continue;
    for (const [cat, count] of Object.entries(map)) {
      scores[cat] = (scores[cat] || 0) + count;
    }
  }
  return scores;
}

/**
 * Suggest category from note and amount using on-device ML
 */
export function suggestCategoryFromNote(cls: Classifier, note: string | undefined, amount: number): string {
  const tokens = tokenize(note);
  const scores = scoreByClassifier(cls, tokens);
  let best: { cat: string; score: number } | null = null;
  
  for (const [cat, sc] of Object.entries(scores)) {
    if (!best || sc > best.score) {
      best = { cat, score: sc };
    }
  }

  // If classifier has a strong match, use it
  if (best && best.score > 0) {
    return best.cat;
  }

  // Enhanced heuristics for better accuracy
  const heuristics: Array<[RegExp, string]> = [
    // Food & Dining
    [/coffee|starbucks|latte|cafe|restaurant|dining|food|grocery|supermarket|pizza|burger|sushi|mcdonalds|kfc|subway/i, 'Food'],
    [/breakfast|lunch|dinner|meal|eat|drink|beverage/i, 'Food'],
    
    // Transport
    [/uber|lyft|taxi|cab|ride|transport|bus|train|metro|subway|transit/i, 'Transport'],
    [/gas|petrol|fuel|parking|toll|car|vehicle|driving/i, 'Transport'],
    [/airline|flight|airport|plane|ticket/i, 'Transport'],
    
    // Rent & Housing
    [/rent|mortgage|housing|apartment|lease|landlord/i, 'Rent'],
    [/utility|electric|water|gas|internet|wifi|phone|internet bill/i, 'Utilities'],
    
    // Income
    [/salary|payroll|paycheck|income|wage|deposit|bonus/i, 'Salary'],
    [/payment received|freelance|consulting|invoice paid/i, 'Salary'],
    
    // Shopping
    [/amazon|shop|purchase|buy|store|mall|retail/i, 'Shopping'],
    [/clothing|clothes|shoes|apparel|fashion/i, 'Shopping'],
    
    // Entertainment
    [/movie|cinema|netflix|spotify|music|game|entertainment|fun/i, 'Entertainment'],
    [/concert|show|event|ticket|theater/i, 'Entertainment'],
    
    // Healthcare
    [/pharmacy|drug|medicine|doctor|hospital|medical|health|dental/i, 'Healthcare'],
    
    // Education
    [/school|university|college|education|course|tuition|book|textbook/i, 'Education'],
  ];
  
  const txt = (note || '').toLowerCase();
  for (const [re, cat] of heuristics) {
    if (re.test(txt)) {
      return cat;
    }
  }

  // Amount-based heuristics
  if (amount > 1000 && !note) {
    return 'Salary';
  }
  
  if (amount < 5) {
    return 'Food'; // Likely a small purchase
  }

  return 'Other';
}
