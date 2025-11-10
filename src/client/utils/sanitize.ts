/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize string input by escaping HTML
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input: any): number | null {
  if (typeof input === 'number' && isFinite(input)) {
    return input;
  }
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

/**
 * Sanitize wallet address
 */
export function sanitizeAddress(address: string): string {
  if (typeof address !== 'string') {
    return '';
  }
  // Ethereum addresses are 42 characters (0x + 40 hex chars)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (addressRegex.test(address)) {
    return address.toLowerCase();
  }
  return '';
}

/**
 * Sanitize category name
 */
export function sanitizeCategory(category: string): string {
  if (typeof category !== 'string') {
    return '';
  }
  // Remove any HTML tags and limit length
  return sanitizeString(category.trim().slice(0, 50));
}

/**
 * Sanitize transaction note
 */
export function sanitizeNote(note: string): string {
  if (typeof note !== 'string') {
    return '';
  }
  // Remove HTML but preserve line breaks, limit length
  return sanitizeString(note.trim().slice(0, 500));
}

