/**
 * Smart Receipt OCR Scanner
 * On-device OCR using Tesseract.js for receipt text extraction
 * Automatically extracts transaction data from receipt images
 * No external API calls - all processing happens locally
 */

import { Transaction } from '../../types';

export interface OCRResult {
  success: boolean;
  extractedText: string;
  transaction?: Partial<Transaction>;
  confidence: number;
  error?: string;
}

export interface ReceiptData {
  merchant?: string;
  amount?: number;
  date?: string;
  items?: Array<{
    description: string;
    amount: number;
  }>;
  tax?: number;
  total: number;
}

/**
 * Initialize Tesseract.js worker
 * Note: This requires installing tesseract.js as a dependency
 */
let tesseractWorker: any = null;

async function initializeOCR(): Promise<void> {
  if (tesseractWorker) return;

  try {
    // Dynamic import to avoid issues if Tesseract.js is not installed
    const { createWorker } = await import('tesseract.js');

    tesseractWorker = await createWorker();
    await tesseractWorker.loadLanguage('eng');
    await tesseractWorker.initialize('eng');

    // Configure for receipt scanning
    await tesseractWorker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,-$/ ',
      tessedit_pageseg_mode: '6', // Uniform block of text
    });
  } catch (error) {
    console.warn('Tesseract.js not available:', error);
    throw new Error('OCR functionality requires Tesseract.js. Install with: npm install tesseract.js');
  }
}

/**
 * Extract text from image using OCR
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
  await initializeOCR();

  try {
    const { data: { text } } = await tesseractWorker.recognize(imageFile);
    return text;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Parse receipt text to extract transaction data
 */
export function parseReceiptText(text: string): ReceiptData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const receiptData: ReceiptData = {
    total: 0,
    items: [],
  };

  // Extract merchant name (usually first non-empty line)
  if (lines.length > 0) {
    receiptData.merchant = extractMerchant(lines[0]);
  }

  // Extract date
  receiptData.date = extractDate(text);

  // Extract items and amounts
  const { items, tax, total } = extractItemsAndTotal(lines);
  receiptData.items = items;
  receiptData.tax = tax;
  receiptData.total = total;

  return receiptData;
}

/**
 * Extract merchant name from receipt text
 */
function extractMerchant(firstLine: string): string {
  // Remove common receipt prefixes
  const cleaned = firstLine
    .replace(/^(receipt|invoice|bill)/i, '')
    .replace(/[#\d]+$/, '') // Remove trailing numbers
    .trim();

  // Capitalize words
  return cleaned.replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Extract date from receipt text
 */
function extractDate(text: string): string | undefined {
  // Common date patterns
  const datePatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g, // MM/DD/YYYY or DD/MM/YYYY
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g, // YYYY/MM/DD
    /\b(\w{3})\s+(\d{1,2}),?\s+(\d{4})\b/g, // Mon DD, YYYY
    /\b(\d{1,2})\s+(\w{3})\s+(\d{4})\b/g, // DD Mon YYYY
  ];

  for (const pattern of datePatterns) {
    const match = pattern.exec(text);
    if (match) {
      try {
        // Try to parse as date
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        continue;
      }
    }
  }

  return undefined;
}

/**
 * Extract items and total from receipt lines
 */
function extractItemsAndTotal(lines: string[]): {
  items: Array<{ description: string; amount: number }>;
  tax: number;
  total: number;
} {
  const items: Array<{ description: string; amount: number }> = [];
  let tax = 0;
  let total = 0;

  // Amount extraction regex
  const amountRegex = /\$?(\d+(?:\.\d{2})?)/g;

  for (const line of lines) {
    const amounts = [];
    let match;
    while ((match = amountRegex.exec(line)) !== null) {
      amounts.push(parseFloat(match[1]));
    }

    if (amounts.length === 0) continue;

    const lineLower = line.toLowerCase();

    // Check for total
    if (lineLower.includes('total') && !lineLower.includes('subtotal')) {
      total = Math.max(total, ...amounts);
    }
    // Check for tax
    else if (lineLower.includes('tax') || lineLower.includes('gst') || lineLower.includes('vat')) {
      tax = Math.max(tax, ...amounts);
    }
    // Check for item lines (usually have description + amount)
    else if (amounts.length === 1 && line.length > amounts[0].toString().length + 5) {
      const amount = amounts[0];
      const description = line.replace(amountRegex, '').trim();

      // Skip if description is too short or looks like header/footer
      if (description.length > 3 &&
          !description.toLowerCase().includes('thank you') &&
          !description.toLowerCase().includes('change') &&
          !description.toLowerCase().includes('cash') &&
          !description.toLowerCase().includes('card')) {
        items.push({ description, amount });
      }
    }
  }

  // If no total found but we have items, sum them up
  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, item) => sum + item.amount, 0) + tax;
  }

  return { items, tax, total };
}

/**
 * Convert receipt data to transaction
 */
export function receiptDataToTransaction(
  receiptData: ReceiptData,
  category: string = 'Other'
): Partial<Transaction> {
  const now = new Date();
  const transactionDate = receiptData.date ? new Date(receiptData.date) : now;

  // Use merchant as note, or combine items if no merchant
  let note = receiptData.merchant || '';
  if (!note && receiptData.items && receiptData.items.length > 0) {
    note = receiptData.items.slice(0, 2).map(item => item.description).join(', ');
    if (receiptData.items.length > 2) note += '...';
  }

  return {
    amount: -Math.abs(receiptData.total), // Negative for expense
    category,
    note: note || 'Receipt scan',
    timestamp: transactionDate.toISOString(),
    type: 'expense',
  };
}

/**
 * Main OCR function - scan receipt and extract transaction
 */
export async function scanReceipt(
  imageFile: File,
  defaultCategory: string = 'Food'
): Promise<OCRResult> {
  try {
    // Extract text from image
    const extractedText = await extractTextFromImage(imageFile);

    if (!extractedText.trim()) {
      return {
        success: false,
        extractedText: '',
        confidence: 0,
        error: 'No text found in image',
      };
    }

    // Parse receipt data
    const receiptData = parseReceiptText(extractedText);

    // Validate extracted data
    if (receiptData.total === 0) {
      return {
        success: false,
        extractedText,
        confidence: 0.3,
        error: 'Could not extract total amount from receipt',
      };
    }

    // Convert to transaction
    const transaction = receiptDataToTransaction(receiptData, defaultCategory);

    // Calculate confidence based on data completeness
    let confidence = 0.5; // Base confidence
    if (receiptData.merchant) confidence += 0.2;
    if (receiptData.date) confidence += 0.1;
    if (receiptData.items && receiptData.items.length > 0) confidence += 0.2;
    confidence = Math.min(1, confidence);

    return {
      success: true,
      extractedText,
      transaction,
      confidence,
    };

  } catch (error) {
    return {
      success: false,
      extractedText: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
}

/**
 * Clean up OCR resources
 */
export async function cleanupOCR(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}

/**
 * Get OCR status and capabilities
 */
export function getOCRStatus(): {
  available: boolean;
  workerInitialized: boolean;
  supportedFormats: string[];
} {
  return {
    available: typeof window !== 'undefined' && 'Worker' in window,
    workerInitialized: tesseractWorker !== null,
    supportedFormats: ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'],
  };
}