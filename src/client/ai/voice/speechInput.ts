/**
 * Offline Voice Commands
 * Speech-to-text transaction input using Web Speech API
 * Completely offline - no external services required
 * Converts voice commands like "Log $8 lunch at Chipotle" into transactions
 */

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare var SpeechGrammarList: {
  prototype: SpeechGrammarList;
  new(): SpeechGrammarList;
};

import { Transaction } from '../../types';

export interface VoiceCommand {
  rawTranscript: string;
  parsedIntent: 'add_transaction' | 'unknown';
  confidence: number;
  transaction?: Partial<Transaction>;
  error?: string;
}

export interface VoiceRecognitionResult {
  success: boolean;
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceCommandExamples {
  category: string;
  examples: string[];
  patterns: RegExp[];
}

/**
 * Voice command patterns and examples
 */
export const VOICE_COMMAND_PATTERNS: VoiceCommandExamples[] = [
  {
    category: 'add_transaction',
    examples: [
      'Log $8 lunch at Chipotle',
      'Spent 25 dollars on gas',
      'Paid 12.50 for coffee',
      'Bought groceries for 45 dollars',
      'Charged 100 dollars to my card for dinner',
    ],
    patterns: [
      /\b(log|add|spent|paid|bought|charged)\s+\$?(\d+(?:\.\d{2})?)\s+(?:dollars?|bucks?)?\s+(?:for|on|at)\s+(.+)/i,
      /\b(log|add|spent|paid|bought|charged)\s+(\d+(?:\.\d{2})?)\s+dollars?\s+(?:for|on|at)\s+(.+)/i,
      /\b(log|add|spent|paid|bought|charged)\s+\$?(\d+(?:\.\d{2})?)\s+(?:for|on|at)\s+(.+)/i,
    ],
  },
];

/**
 * Voice Command Processor
 */
export class VoiceCommandProcessor {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onResultCallback?: (result: VoiceRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    this.initializeRecognition();
  }

  /**
   * Initialize speech recognition
   */
  private initializeRecognition(): void {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    // Set up event handlers
    this.recognition.onresult = (event) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (lastResult) {
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence || 0.5;
        const isFinal = lastResult.isFinal;

        if (this.onResultCallback) {
          this.onResultCallback({
            success: true,
            transcript,
            confidence,
            isFinal,
          });
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.onstart = () => {
      this.isListening = true;
    };
  }

  /**
   * Start listening for voice input
   */
  startListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      this.onResultCallback = onResult;
      this.onErrorCallback = onError;

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Check if voice commands are supported
   */
  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Get listening status
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

/**
 * Parse voice transcript into transaction data
 */
export function parseVoiceCommand(transcript: string): VoiceCommand {
  const rawTranscript = transcript.trim();

  // Try to match against known patterns
  for (const patternGroup of VOICE_COMMAND_PATTERNS) {
    for (const pattern of patternGroup.patterns) {
      const match = rawTranscript.match(pattern);
      if (match) {
        if (patternGroup.category === 'add_transaction') {
          const amount = parseFloat(match[2]);
          const description = match[3].trim();

          if (isNaN(amount) || amount <= 0) {
            return {
              rawTranscript,
              parsedIntent: 'unknown',
              confidence: 0.1,
              error: 'Could not parse amount',
            };
          }

          // Determine category from description
          const category = inferCategoryFromDescription(description);

          // Create transaction
          const transaction: Partial<Transaction> = {
            amount: -Math.abs(amount), // Negative for expense
            category,
            note: description,
            timestamp: new Date().toISOString(),
            type: 'expense',
          };

          return {
            rawTranscript,
            parsedIntent: 'add_transaction',
            confidence: 0.8, // High confidence for pattern match
            transaction,
          };
        }
      }
    }
  }

  // Try fuzzy matching for common phrases
  const fuzzyMatch = fuzzyParseTranscript(rawTranscript);
  if (fuzzyMatch) {
    return fuzzyMatch;
  }

  return {
    rawTranscript,
    parsedIntent: 'unknown',
    confidence: 0.1,
    error: 'Could not understand the command',
  };
}

/**
 * Infer category from transaction description
 */
function inferCategoryFromDescription(description: string): string {
  const desc = description.toLowerCase();

  const categoryMappings: Record<string, string[]> = {
    'Food': ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'chipotle', 'mcdonalds', 'starbucks', 'coffee', 'meal', 'eat'],
    'Transport': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'bus', 'train', 'ride'],
    'Shopping': ['amazon', 'store', 'shopping', 'buy', 'purchase', 'grocery', 'supermarket'],
    'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'concert', 'game'],
    'Healthcare': ['doctor', 'pharmacy', 'medical', 'hospital', 'medicine'],
    'Utilities': ['electric', 'internet', 'phone', 'water', 'gas bill'],
  };

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}

/**
 * Fuzzy parsing for transcripts that don't match exact patterns
 */
function fuzzyParseTranscript(transcript: string): VoiceCommand | null {
  const text = transcript.toLowerCase();

  // Look for amount patterns
  const amountPatterns = [
    /\$\s*(\d+(?:\.\d{2})?)/g,
    /(\d+(?:\.\d{2})?)\s+dollars?/g,
    /(\d+(?:\.\d{2})?)\s*bucks/g,
  ];

  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = pattern.exec(text);
    if (match) {
      amount = parseFloat(match[1]);
      break;
    }
  }

  if (!amount || amount <= 0) {
    return null;
  }

  // Look for action words
  const actionWords = ['spent', 'paid', 'bought', 'charged', 'log', 'add'];
  const hasAction = actionWords.some(word => text.includes(word));

  if (!hasAction) {
    return null;
  }

  // Extract description (everything after amount)
  let description = '';
  const amountIndex = text.indexOf(amount.toString());
  if (amountIndex !== -1) {
    description = transcript.substring(amountIndex + amount.toString().length).trim();
    // Remove common connector words
    description = description.replace(/^(for|on|at|to)\s+/i, '');
  }

  if (!description) {
    return null;
  }

  const category = inferCategoryFromDescription(description);

  return {
    rawTranscript: transcript,
    parsedIntent: 'add_transaction',
    confidence: 0.6, // Lower confidence for fuzzy matching
    transaction: {
      amount: -Math.abs(amount),
      category,
      note: description,
      timestamp: new Date().toISOString(),
      type: 'expense',
    },
  };
}

/**
 * Convert voice command to full transaction
 */
export function voiceCommandToTransaction(command: VoiceCommand): Omit<Transaction, 'id'> | null {
  if (!command.transaction) {
    return null;
  }

  return {
    amount: command.transaction.amount!,
    category: command.transaction.category!,
    note: command.transaction.note!,
    timestamp: command.transaction.timestamp!,
    type: command.transaction.type!,
  };
}

/**
 * Get voice command examples
 */
export function getVoiceCommandExamples(): string[] {
  return VOICE_COMMAND_PATTERNS.flatMap(group => group.examples);
}

/**
 * Get voice recognition status
 */
export function getVoiceRecognitionStatus(): {
  supported: boolean;
  available: boolean;
  language: string;
} {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  return {
    supported: !!SpeechRecognition,
    available: !!SpeechRecognition,
    language: 'en-US',
  };
}

/**
 * Validate voice command
 */
export function validateVoiceCommand(command: VoiceCommand): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (command.parsedIntent === 'unknown') {
    warnings.push('Command not recognized');
    suggestions.push('Try saying: "Log $8 lunch at Chipotle"');
    suggestions.push('Try saying: "Spent 25 dollars on gas"');
  }

  if (command.confidence < 0.5) {
    warnings.push('Low confidence parsing - please verify the transaction');
  }

  if (command.transaction?.amount && Math.abs(command.transaction.amount) > 1000) {
    warnings.push('Large amount detected - please verify');
  }

  if (command.transaction?.category === 'Other') {
    suggestions.push('Consider adding more descriptive words to help categorize automatically');
  }

  return {
    isValid: warnings.length === 0 && command.parsedIntent !== 'unknown',
    warnings,
    suggestions,
  };
}

/**
 * Process voice command with validation
 */
export function processVoiceCommand(transcript: string): {
  command: VoiceCommand;
  validation: ReturnType<typeof validateVoiceCommand>;
  transaction?: Omit<Transaction, 'id'>;
} {
  const command = parseVoiceCommand(transcript);
  const validation = validateVoiceCommand(command);
  const transaction = command.transaction ? voiceCommandToTransaction(command) : undefined;

  return {
    command,
    validation,
    transaction: transaction || undefined,
  };
}