import React from 'react';
import WalletLogin from '../components/WalletLogin';

const LoginPage: React.FC = () => {
  const onConnected = () => {
    window.dispatchEvent(new Event('safepay:session-changed'));
    window.location.hash = '#/dashboard';
  };

  return (
    <div className="sp-page">
      {/* Header */}
      <div className="header">
        <div>
          <h1 className="title">SafePay AI</h1>
          <p className="subtitle">Decentralized Expense & Privacy Guardian</p>
        </div>
        <div className="small-muted">Wallet-based login • No email • No central account</div>
      </div>

      {/* Hero / Two-column layout */}
      <div className="main-grid">
        {/* Left: Marketing & Benefits */}
        <div>
          <div
            className="card"
            style={{
              background:
                'linear-gradient(135deg, rgba(0, 209, 161, 0.08) 0%, rgba(66, 153, 225, 0.08) 100%)',
              border: '1px solid var(--card-border)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Sign in with your wallet</h2>
            <p className="small-muted" style={{ marginTop: 0 }}>
              Connect using a Web3 wallet (e.g., MetaMask). Authentication is done by signing a short-lived message — no email,
              password, or personal data required. Your wallet is your identity.
            </p>

            {/* Value props */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginTop: 12,
              }}
            >
              <div className="card" style={{ background: 'var(--color-charcoal)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span>🔒</span>
                  <strong>Private by Design</strong>
                </div>
                <p className="small-muted" style={{ margin: 0 }}>
                  No passwords, no email. Your data stays on-device with wallet-encrypted storage.
                </p>
              </div>
              <div className="card" style={{ background: 'var(--color-charcoal)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span>⚡</span>
                  <strong>Fast & Frictionless</strong>
                </div>
                <p className="small-muted" style={{ margin: 0 }}>
                  One-click signature, no account creation. You&apos;re in within seconds.
                </p>
              </div>
              <div className="card" style={{ background: 'var(--color-charcoal)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span>🛡️</span>
                  <strong>Zero Trust</strong>
                </div>
                <p className="small-muted" style={{ margin: 0 }}>
                  We never see your keys. Signatures are verified client-side.
                </p>
              </div>
            </div>

            {/* Help / Steps */}
            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: '8px 0' }}>How it works</h3>
              <ol className="small-muted" style={{ marginTop: 8 }}>
                <li>Install MetaMask or a Web3-compatible wallet extension.</li>
                <li>Click Connect Wallet and approve the signature request.</li>
                <li>To logout, disconnect from your wallet or clear the session.</li>
              </ol>
            </div>
          </div>

          {/* Trust badges */}
          <div
            className="card"
            style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}
            aria-label="Security & Privacy Badges"
          >
            <span className="badge badge-success">On-Device</span>
            <span className="badge badge-warning">Wallet-Encrypted</span>
            <span className="badge badge-error">No Cloud Uploads</span>
            <span className="small-muted" style={{ marginLeft: 'auto' }}>v1.0.0</span>
          </div>
        </div>

        {/* Right: Login Card */}
        <aside className="sidebar">
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Connect Wallet</h3>
            <p className="small-muted" style={{ marginTop: 0 }}>
              Authenticate by signing a message. No private keys or seed phrases are ever transmitted.
            </p>
            <div style={{ marginTop: 12 }}>
              <WalletLogin onConnected={onConnected} />
            </div>
            <div className="small-muted" style={{ marginTop: 12 }}>
              WalletConnect support <em>coming soon</em>.
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Need help?</h4>
            <ul className="small-muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Make sure your wallet is unlocked.</li>
              <li>Approve the connection and signature prompts.</li>
              <li>If stuck, refresh the page and try again.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LoginPage;
