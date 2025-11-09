import React, { useEffect, useState } from 'react';
import { disconnectWallet } from '../services/wallet';
import { SessionStorage, TransactionCache, EncryptionStorage } from '../utils/storage';

const truncate = (s?: string) => s ? s.slice(0,6) + '…' + s.slice(-4) : '';


const BottomNav: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [current, setCurrent] = useState<string>('/dashboard');

  useEffect(() => {
    const session = SessionStorage.loadSession();
    if (session?.address) {
      setAddress(session.address);
    }
    const updateHash = () => {
      const hash = window.location.hash || '#/dashboard';
      setCurrent(hash.startsWith('#') ? hash.slice(1) : hash);
    };
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  const handleLogout = async () => {
    // Best-effort wallet disconnect (may be unsupported)
    try { await disconnectWallet(); } catch {}

    // Clear app session + encryption context + cached decrypted data
    SessionStorage.clearSession();
    EncryptionStorage.clearEncryptionAddress();
    TransactionCache.clearCache();

    // Broadcast unified session change so listeners update immediately
    try { window.dispatchEvent(new Event('safepay:session-changed')); } catch {}

    // Local state reset
    setAddress(null);

    // Redirect to login (use login instead of connect for clarity)
    window.location.hash = '#/login';
  };

  const LinkBtn: React.FC<{ path: string; label: string }> = ({ path, label }) => (
    <button
      className={`sp-btn ${current === path ? 'active' : ''}`}
      onClick={() => window.location.hash = '#' + path}
      aria-current={current === path ? 'page' : undefined}
      style={{ marginLeft: 8, marginRight: 8 }}
    >
      {label}
    </button>
  );

  return (
    <header className="sp-top-nav" role="navigation" aria-label="Main navigation">
      <div className="sp-nav-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a onClick={() => window.location.hash = '#/dashboard'} className="sp-logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Brown-themed compact logo */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect width="36" height="36" rx="8" fill="#24170f" />
              <path d="M9 18h18M18 9v18" stroke="#B9754A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontWeight: 800, color: 'var(--color-offwhite)', fontSize: 16 }}>SafePay</span>
          </a>
        </div>
      </div>

      <nav className="sp-nav-center" aria-label="Primary">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <LinkBtn path="/dashboard" label="Dashboard" />
          <LinkBtn path="/add" label="Add" />
          <LinkBtn path="/history" label="History" />
          <LinkBtn path="/insights" label="Insights" />
          <LinkBtn path="/settings" label="Settings" />
        </div>
      </nav>

      <div className="sp-nav-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {address ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sp-wallet-line" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--color-offwhite)' }}>Connected</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{truncate(address)}</div>
            </div>
            <button
              className="sp-btn sp-btn-ghost"
              onClick={handleLogout}
              aria-label="Disconnect wallet and clear session"
              title="Disconnect wallet and clear session"
              style={{ borderColor: 'var(--color-softred)', color: 'var(--color-softred)' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="sp-btn" onClick={() => window.location.hash = '#/login'}>Login</button>
            <button className="sp-btn active" onClick={() => window.location.hash = '#/connect'}>Connect Wallet</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default BottomNav;
