import React, { useEffect, useMemo, useState } from 'react';
import WalletLogin from '../components/WalletLogin';
import { SessionStorage } from '../utils/storage';

const ConnectPage: React.FC = () => {
  // Track session reactively so UI updates after logout/login
  const [session, setSession] = useState(SessionStorage.loadSession());
  const [hash, setHash] = useState(window.location.hash);

  // Derive current route segment from hash
  const current = useMemo(() => (hash.replace('#','').split('/')[1] || 'dashboard'), [hash]);

  // Keep session and hash in sync with navigation and visibility changes
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    const onFocus = () => setSession(SessionStorage.loadSession());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'safepay_session') {
        setSession(SessionStorage.loadSession());
      }
    };
    const onSessionChanged = () => setSession(SessionStorage.loadSession());

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('safepay:session-changed', onSessionChanged as EventListener);

    // Initial sync (covers cases where logout happened before mount)
    setSession(SessionStorage.loadSession());

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('safepay:session-changed', onSessionChanged as EventListener);
    };
  }, []);
  
  const onConnected = () => {
    window.location.hash = '#/dashboard';
    // Notify other views that session changed
    window.dispatchEvent(new Event('safepay:session-changed'));
  };
  
  const nav = (path: string) => () => { window.location.hash = `#${path}`; };
   const makeBtn = (path: string, label: string) => (
    <button
      className={`sp-btn sp-btn-ghost ${current === path ? 'active' : ''}`}
      onClick={nav(path)}
      aria-current={current === path ? 'page' : undefined}
    >
      {label}
    </button>
  );

  // If already connected, show a message with option to reconnect
  if (session?.address) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 720, margin: '40px auto' }}>
          <h2>Already Connected</h2>
          <p className="small-muted">
            You're already connected with wallet: <code>{session.address.slice(0, 6)}...{session.address.slice(-4)}</code>
          </p>
          <p className="small-muted">
            Use the "Logout" button in the top navigation to disconnect, or connect a different wallet below.
          </p>
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <WalletLogin onConnected={onConnected} />
          </div>
          <div style={{ marginTop: 20 }}>
            <button 
              className="sp-btn sp-btn-primary" 
              onClick={() => window.location.hash = '#/dashboard'}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
       {/* AI Features Showcase */}
       <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(0, 209, 161, 0.1) 0%, rgba(66, 153, 225, 0.1) 100%)',
        border: '1px solid var(--color-mint)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <h3 style={{ margin: 0, color: 'var(--color-offwhite)' }}>AI-Powered Features</h3>
          <span className="badge badge-success" style={{ marginLeft: 'auto' }}>100% On-Device</span>
        </div>
        <p className="small-muted" style={{ marginBottom: '20px', lineHeight: '1.6' }}>
          SafePay AI includes <strong>5 core AI features</strong> that run entirely on your device. 
          No external APIs, no data leaves your device — complete privacy and security.
        </p>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(0, 209, 161, 0.05)', 
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(0, 209, 161, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>🏷️</span>
              <strong style={{ color: 'var(--color-mint)' }}>Expense Categorization</strong>
            </div>
            <p className="small-muted" style={{ margin: 0, fontSize: '13px' }}>
              Automatic category suggestions with ML learning
            </p>
          </div>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(66, 153, 225, 0.05)', 
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(66, 153, 225, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>💡</span>
              <strong style={{ color: 'var(--color-info)' }}>Financial Insights</strong>
            </div>
            <p className="small-muted" style={{ margin: 0, fontSize: '13px' }}>
              Balance analysis, trends, and savings suggestions
            </p>
          </div>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(229, 62, 62, 0.05)', 
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(229, 62, 62, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
              <strong style={{ color: 'var(--color-softred)' }}>Fraud Detection</strong>
            </div>
            <p className="small-muted" style={{ margin: 0, fontSize: '13px' }}>
              Duplicate detection, unusual patterns, risk alerts
            </p>
          </div>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(72, 187, 120, 0.05)', 
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(72, 187, 120, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>💰</span>
              <strong style={{ color: 'var(--color-success)' }}>Budget Recommendations</strong>
            </div>
            <p className="small-muted" style={{ margin: 0, fontSize: '13px' }}>
              Budget status, alerts, and optimization tips
            </p>
          </div>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(159, 122, 234, 0.05)', 
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(159, 122, 234, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>🧠</span>
              <strong style={{ color: '#9F7AEA' }}>Pattern Recognition</strong>
            </div>
            <p className="small-muted" style={{ margin: 0, fontSize: '13px' }}>
              Keyword matching and adaptive learning
            </p>
          </div>
        </div>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: 'rgba(0, 0, 0, 0.2)', 
          borderRadius: 'var(--radius)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <p className="small-muted" style={{ margin: 0, fontSize: '13px' }}>
            <strong>All features are 100% on-device</strong> — no external APIs, no data leaves your device. 
            Complete privacy and security guaranteed.
          </p>
        </div>
      </div>
      
      <div className="card" style={{ maxWidth: 720, margin: '40px auto' }}>
        <h2>Welcome to SafePay AI</h2>
        <p className="small-muted">Connect your wallet to get started. You'll only need to do this once per device.</p>
        <WalletLogin onConnected={onConnected} />
      </div>
    </div>
  );
};

export default ConnectPage;
