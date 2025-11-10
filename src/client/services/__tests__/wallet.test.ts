/**
 * Wallet Service Tests
 */

import { isWeb3Available } from '../wallet';

// Mock window.ethereum
const mockEthereum = {
  isMetaMask: true,
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

describe('Wallet Service', () => {
  beforeEach(() => {
    (window as any).ethereum = mockEthereum;
  });

  afterEach(() => {
    delete (window as any).ethereum;
  });

  describe('isWeb3Available', () => {
    test('should return true when ethereum is available', () => {
      expect(isWeb3Available()).toBe(true);
    });

    test('should return false when ethereum is not available', () => {
      delete (window as any).ethereum;
      expect(isWeb3Available()).toBe(false);
    });
  });
});

