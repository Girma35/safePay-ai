/**
 * Cryptographic utilities for SafePay AI
 * Handles encryption, decryption, and key derivation
 */

/**
 * Convert ArrayBuffer to base64
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

/**
 * Convert base64 to ArrayBuffer
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from wallet signature
 */
export async function deriveKeyFromSignature(signature: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt data with AES-GCM
 */
export async function encryptWithKey(key: CryptoKey, data: any): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt data with AES-GCM
 */
export async function decryptWithKey(key: CryptoKey, encrypted: string): Promise<any> {
  const buffer = base64ToBuffer(encrypted);
  const bytes = new Uint8Array(buffer);
  
  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}

/**
 * Generate a hash for transaction proof
 */
export async function hashTransaction(transaction: {
  amount: number;
  type: string;
  category: string;
  note?: string;
  timestamp: string;
}): Promise<string> {
  const payload = JSON.stringify({
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    note: transaction.note || '',
    timestamp: transaction.timestamp,
  });
  
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hashHex;
}

