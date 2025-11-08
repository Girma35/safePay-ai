import React from 'react';
import WalletLogin from '../components/WalletLogin';

const LoginPage: React.FC = () => {
  return (
    <div style={{ fontFamily: 'Inter, Roboto, system-ui, sans-serif', maxWidth: 900, margin: '40px auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>SafePay AI</h1>
          <p style={{ margin: 0, color: '#666' }}>Decentralized Expense & Privacy Guardian</p>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>Wallet-based login • No email • No central account</div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <section>
          <h2>Sign in with your wallet</h2>
          <p>
            Connect using a Web3 wallet (e.g., MetaMask). Authentication is done by signing a short-lived nonce — no email, password,
            or personal data is required. Your wallet is your identity; Seed phrase recovery is handled by your wallet provider.
          </p>

          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 8 }}>Why this method?</h3>
            <ul>
              <li>Full ownership of your identity and data.</li>
              <li>No credentials are stored on our servers.</li>
              <li>Easy, fast, and private authentication via signature.</li>
            </ul>
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 8 }}>Need help?</h3>
            <ol>
              <li>Install MetaMask or a Web3-compatible wallet extension.</li>
              <li>Click Connect Wallet and approve the signature request.</li>
              <li>If you lose access to your wallet, recover using the seed phrase from your wallet provider.</li>
            </ol>
          </div>
        </section>

        <aside style={{ borderLeft: '1px solid #eee', paddingLeft: 20 }}>
          <div style={{ background: '#fafafa', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Quick actions</h3>
            <WalletLogin />
            <div style={{ marginTop: 12 }}>
              <button disabled style={{ width: '100%', padding: '10px', borderRadius: 6 }}>WalletConnect (coming soon)</button>
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
            <strong>Privacy:</strong>
            <p style={{ marginTop: 6 }}>
              All authentication is done by signing locally in your wallet. The server only sees the signed proof and the public
              address. No private keys or seed phrases are transmitted.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default LoginPage;
