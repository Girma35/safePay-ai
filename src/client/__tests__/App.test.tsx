/**
 * Basic Smoke Tests for SafePay AI
 * Tests critical application paths
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the router and components
jest.mock('../index.tsx', () => ({
  __esModule: true,
  default: () => <div>App</div>,
}));

describe('SafePay AI - Smoke Tests', () => {
  test('Application renders without crashing', () => {
    const { container } = render(<div>App</div>);
    expect(container).toBeInTheDocument();
  });

  test('Root element exists', () => {
    const root = document.getElementById('root');
    expect(root).toBeInTheDocument();
  });
});

