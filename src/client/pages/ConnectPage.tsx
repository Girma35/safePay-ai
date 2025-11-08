import React from 'react';
import WalletLogin from '../components/WalletLogin';
import { SessionStorage } from '../utils/storage';

const current = window.location.hash.replace('#','').split('/')[1] || 'dashboard';

const ConnectPage: React.FC = () => {
  const session = SessionStorage.loadSession();
  
  const onConnected = () => {
    window.location.hash = '#/dashboard';
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
      <div className="card" style={{ maxWidth: 720, margin: '40px auto' }}>
        <h2>Welcome to SafePay AI</h2>
        <p className="small-muted">Connect your wallet to get started. You'll only need to do this once per device.</p>
        <WalletLogin onConnected={onConnected} />
      </div>
    </div>
  );
};

export default ConnectPage;
