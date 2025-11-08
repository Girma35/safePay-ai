/**
 * SafePay AI - Main Entry Point
 * Decentralized Financial Management Application
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import './styles/theme.css';

import LoginPage from './pages/LoginPage';
import Homepage from './pages/Homepage';
import ConnectPage from './pages/ConnectPage';
import HistoryPage from './pages/HistoryPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';
import AddTransaction from './components/AddTransaction';
import BottomNav from './components/BottomNav';
import StatusBadge from './components/StatusBadge';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { SessionStorage, TransactionCache } from './utils/storage';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  // Simple hash-based router
  const render = () => {
    let hash = window.location.hash || '#/dashboard';
    // Normalize leading '#'
    if (hash.startsWith('#')) hash = hash.slice(1);

    // Check for session
    const session = SessionStorage.loadSession();
    
    // Redirect to connect if no session (except for connect/login pages)
    if (!session && !hash.startsWith('/connect') && !hash.startsWith('/login')) {
      window.location.hash = '#/connect';
      root.render(
        <>
          <BottomNav />
          <ConnectPage />
        </>
      );
      return;
    }

    // Load transaction cache in background (don't await to avoid blocking render)
    TransactionCache.loadCache().catch(error => {
      console.error('Failed to load transaction cache:', error);
    });

    // Route to appropriate page
    const page = (() => {
      if (hash.startsWith('/login')) return <LoginPage />;
      if (hash.startsWith('/connect')) return <ConnectPage />;
      if (hash.startsWith('/dashboard')) return <Homepage />;
      if (hash.startsWith('/add')) return <AddTransaction />;
      if (hash.startsWith('/history')) return <HistoryPage />;
      if (hash.startsWith('/insights')) return <InsightsPage />;
      if (hash.startsWith('/settings')) return <SettingsPage />;
      return <Homepage />;
    })();

    root.render(
      <ErrorBoundary>
        <ToastProvider>
          <BottomNav />
          {page}
          <StatusBadge />
        </ToastProvider>
      </ErrorBoundary>
    );
  };

  // Handle hash changes
  window.addEventListener('hashchange', render);
  // Initial render
  render();
} else {
  console.error('No root element found');
}