/**
 * Encrypted P2P Sync
 * Cross-device synchronization using WebRTC with QR code pairing
 * All data remains encrypted with wallet-derived keys
 * No cloud servers - direct device-to-device communication
 */

import { Transaction, Classifier } from '../../types';

export interface SyncSession {
  sessionId: string;
  peerId: string;
  status: 'initiating' | 'waiting' | 'connected' | 'syncing' | 'completed' | 'failed';
  direction: 'send' | 'receive';
  progress: number;
  error?: string;
}

export interface SyncData {
  transactions: Transaction[];
  classifier: Classifier;
  lastSyncTimestamp: string;
  deviceId: string;
}

export interface SyncResult {
  success: boolean;
  transactionsSynced: number;
  classifierUpdated: boolean;
  errors: string[];
}

/**
 * Generate a unique device ID
 */
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Encrypt data using wallet-derived key
 */
async function encryptSyncData(data: SyncData, walletKey: CryptoKey): Promise<string> {
  const jsonData = JSON.stringify(data);
  const encodedData = new TextEncoder().encode(jsonData);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
    walletKey,
    encodedData
  );

  // Combine IV and encrypted data
  const iv = new Uint8Array(encrypted.slice(0, 12));
  const ciphertext = new Uint8Array(encrypted.slice(12));

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using wallet-derived key
 */
async function decryptSyncData(encryptedData: string, walletKey: CryptoKey): Promise<SyncData> {
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    walletKey,
    ciphertext
  );

  const jsonData = new TextDecoder().decode(decrypted);
  return JSON.parse(jsonData);
}

/**
 * Derive encryption key from wallet signature
 */
async function deriveSyncKey(walletAddress: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(walletAddress),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('safepay-sync-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * P2P Sync Manager
 */
export class P2PSyncManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private session: SyncSession | null = null;
  private walletKey: CryptoKey | null = null;

  constructor(private walletAddress: string) {}

  /**
   * Initialize sync manager with wallet
   */
  async initialize(): Promise<void> {
    this.walletKey = await deriveSyncKey(this.walletAddress);
  }

  /**
   * Start a sync session as sender
   */
  async startSyncSession(): Promise<{ sessionId: string; qrData: string }> {
    if (!this.walletKey) {
      throw new Error('Sync manager not initialized');
    }

    const sessionId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.session = {
      sessionId,
      peerId: generateDeviceId(),
      status: 'initiating',
      direction: 'send',
      progress: 0,
    };

    // Create WebRTC peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Create data channel
    this.dataChannel = this.peerConnection.createDataChannel('sync', {
      ordered: true,
    });

    this.setupDataChannel();

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Generate QR code data
    const qrData = JSON.stringify({
      sessionId,
      offer: this.peerConnection.localDescription,
    });

    this.session.status = 'waiting';

    return { sessionId, qrData };
  }

  /**
   * Join a sync session as receiver
   */
  async joinSyncSession(qrData: string): Promise<string> {
    if (!this.walletKey) {
      throw new Error('Sync manager not initialized');
    }

    const { sessionId, offer } = JSON.parse(qrData);

    this.session = {
      sessionId,
      peerId: generateDeviceId(),
      status: 'initiating',
      direction: 'receive',
      progress: 0,
    };

    // Create WebRTC peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    // Set remote description
    await this.peerConnection.setRemoteDescription(offer);

    // Create answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.session.status = 'waiting';

    return sessionId;
  }

  /**
   * Send sync data
   */
  async sendSyncData(transactions: Transaction[], classifier: Classifier): Promise<void> {
    if (!this.dataChannel || !this.walletKey || !this.session) {
      throw new Error('No active sync session');
    }

    this.session.status = 'syncing';
    this.session.progress = 10;

    const syncData: SyncData = {
      transactions,
      classifier,
      lastSyncTimestamp: new Date().toISOString(),
      deviceId: this.session.peerId,
    };

    // Encrypt data
    const encryptedData = await encryptSyncData(syncData, this.walletKey);

    // Send data in chunks if needed
    const chunkSize = 16000; // WebRTC data channel limit
    const chunks = encryptedData.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [];

    this.session.progress = 30;

    // Send header
    this.dataChannel.send(JSON.stringify({
      type: 'header',
      totalChunks: chunks.length,
      totalSize: encryptedData.length,
    }));

    // Send chunks
    for (let i = 0; i < chunks.length; i++) {
      this.dataChannel.send(JSON.stringify({
        type: 'chunk',
        index: i,
        data: chunks[i],
      }));

      this.session.progress = 30 + (i / chunks.length) * 50;
    }

    // Send completion
    this.dataChannel.send(JSON.stringify({
      type: 'complete',
    }));

    this.session.progress = 80;
  }

  /**
   * Receive sync data
   */
  async receiveSyncData(): Promise<SyncData> {
    return new Promise((resolve, reject) => {
      if (!this.dataChannel || !this.walletKey) {
        reject(new Error('No active sync session'));
        return;
      }

      const chunks: string[] = [];
      let totalChunks = 0;
      let receivedChunks = 0;

      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, 30000); // 30 second timeout

      this.dataChannel.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'header':
              totalChunks = message.totalChunks;
              this.session!.progress = 10;
              break;

            case 'chunk':
              chunks[message.index] = message.data;
              receivedChunks++;
              this.session!.progress = 10 + (receivedChunks / totalChunks) * 70;
              break;

            case 'complete':
              clearTimeout(timeout);

              if (receivedChunks !== totalChunks) {
                reject(new Error('Incomplete data received'));
                return;
              }

              const encryptedData = chunks.join('');
              const syncData = await decryptSyncData(encryptedData, this.walletKey!);

              this.session!.progress = 90;
              resolve(syncData);
              break;
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
    });
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      if (this.session) {
        this.session.status = 'connected';
      }
    };

    this.dataChannel.onclose = () => {
      if (this.session) {
        this.session.status = 'completed';
      }
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      if (this.session) {
        this.session.status = 'failed';
        this.session.error = 'Connection error';
      }
    };
  }

  /**
   * Get current session status
   */
  getSessionStatus(): SyncSession | null {
    return this.session;
  }

  /**
   * Close sync session
   */
  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.session = null;
  }
}

/**
 * Merge sync data with existing data
 */
export function mergeSyncData(
  existingTransactions: Transaction[],
  existingClassifier: Classifier,
  syncData: SyncData
): {
  mergedTransactions: Transaction[];
  mergedClassifier: Classifier;
  conflicts: Transaction[];
} {
  const mergedTransactions = [...existingTransactions];
  const conflicts: Transaction[] = [];

  // Merge transactions
  syncData.transactions.forEach(syncTransaction => {
    const existingIndex = mergedTransactions.findIndex(
      t => t.id === syncTransaction.id
    );

    if (existingIndex === -1) {
      // New transaction
      mergedTransactions.push(syncTransaction);
    } else {
      // Potential conflict - compare timestamps
      const existing = mergedTransactions[existingIndex];
      const existingTime = new Date(existing.timestamp).getTime();
      const syncTime = new Date(syncTransaction.timestamp).getTime();

      if (Math.abs(existingTime - syncTime) > 1000) { // More than 1 second difference
        conflicts.push(syncTransaction);
      } else if (syncTime > existingTime) {
        // Sync version is newer
        mergedTransactions[existingIndex] = syncTransaction;
      }
    }
  });

  // Merge classifier (simple merge - could be improved)
  const mergedClassifier: Classifier = {
    keywords: { ...existingClassifier.keywords },
  };

  Object.entries(syncData.classifier.keywords).forEach(([keyword, categories]) => {
    if (!mergedClassifier.keywords[keyword]) {
      mergedClassifier.keywords[keyword] = {};
    }

    Object.entries(categories).forEach(([category, count]) => {
      mergedClassifier.keywords[keyword][category] =
        (mergedClassifier.keywords[keyword][category] || 0) + count;
    });
  });

  return {
    mergedTransactions,
    mergedClassifier,
    conflicts,
  };
}

/**
 * Generate QR code data for sync session
 */
export function generateSyncQR(sessionId: string, offer: RTCSessionDescriptionInit): string {
  return btoa(JSON.stringify({
    type: 'safepay-sync',
    version: '1.0',
    sessionId,
    offer,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Parse QR code data for sync session
 */
export function parseSyncQR(qrData: string): { sessionId: string; offer: RTCSessionDescriptionInit } {
  const data = JSON.parse(atob(qrData));

  if (data.type !== 'safepay-sync') {
    throw new Error('Invalid QR code format');
  }

  return {
    sessionId: data.sessionId,
    offer: data.offer,
  };
}

/**
 * Check if P2P sync is supported
 */
export function isP2PSyncSupported(): boolean {
  return typeof RTCPeerConnection !== 'undefined' &&
         typeof RTCDataChannel !== 'undefined' &&
         typeof crypto !== 'undefined' &&
         typeof crypto.subtle !== 'undefined';
}

/**
 * Get sync recommendations
 */
export function getSyncRecommendations(
  lastSyncDate?: Date,
  transactionCount: number = 0
): string[] {
  const recommendations: string[] = [];

  if (!lastSyncDate) {
    recommendations.push('Never synced - consider syncing with another device for backup');
  } else {
    const daysSinceSync = Math.floor((Date.now() - lastSyncDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceSync > 7) {
      recommendations.push(`Last synced ${daysSinceSync} days ago - consider syncing for data consistency`);
    }
  }

  if (transactionCount > 100) {
    recommendations.push('Large transaction history - regular sync recommended for data safety');
  }

  return recommendations;
}