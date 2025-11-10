# SafePay AI - Decentralized Financial Management

**Privacy-first expense tracking with on-device AI, wallet-backed encryption, and blockchain transaction records.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)

## 🚀 Features

### Core Capabilities
- **🔐 Wallet-Based Authentication** - Connect with MetaMask or any Web3 wallet
- **💾 Local-First Storage** - All data stored locally in your browser
- **🔒 Wallet-Backed Encryption** - Optional AES-256 encryption using your wallet signature
- **🤖 On-Device AI** - 5 core AI features running 100% on your device:
  - Expense Categorization (ML-powered)
  - Financial Insights & Analytics
  - Fraud & Anomaly Detection
  - Budget Recommendations
  - Pattern Recognition
- **⛓️ Blockchain Transaction Records** - Anchor transaction proofs on-chain
- **📊 Comprehensive Dashboard** - Visual insights, trends, and category breakdowns
- **💰 Budget Management** - Set budgets, receive alerts, and get recommendations

### Privacy & Security
- ✅ **100% On-Device Processing** - No external APIs, no data leaves your device
- ✅ **End-to-End Encryption** - Optional wallet-derived encryption keys
- ✅ **No Backend Required** - Fully client-side application
- ✅ **Open Source** - Transparent and auditable code

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Web3 Wallet** (MetaMask, WalletConnect, etc.)
- **Modern Browser** with Web3 support

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "SafePay AI"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your configuration if needed
   ```

## 🏃 Development

### Start Development Server
```bash
npm run dev
```

This will start:
- Webpack dev server on `http://localhost:3001`
- Express server (if configured)

### Build for Production
```bash
npm run build
```

The production build will be output to the `dist/` directory with:
- Minified and optimized JavaScript
- Code splitting for better performance
- Source maps for debugging
- Removed console.log statements

### Run Tests
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 🚀 Deployment to Netlify

### Option 1: Deploy via Netlify CLI

1. **Install Netlify CLI** (if not already installed)
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize and deploy**
   ```bash
   netlify init
   netlify deploy --prod
   ```

### Option 2: Deploy via Git Integration

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your repository

3. **Configure Build Settings**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18 (or higher)

4. **Set Environment Variables** (if needed)
   - Go to Site settings → Environment variables
   - Add `NODE_ENV=production`

5. **Deploy!**
   - Netlify will automatically build and deploy on every push to main branch

### Netlify Configuration

The project includes a `netlify.toml` file with:
- Build configuration
- Security headers (CSP, XSS protection, etc.)
- Cache optimization
- SPA routing support

## 📁 Project Structure

```
SafePay AI/
├── src/
│   ├── client/           # React frontend application
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # Business logic services
│   │   ├── utils/        # Utility functions
│   │   ├── types/        # TypeScript type definitions
│   │   └── styles/       # CSS styles
│   └── server/           # Express server (optional)
├── public/               # Static assets
├── dist/                # Production build output
├── webpack.config.js    # Webpack configuration
├── jest.config.js       # Jest test configuration
└── netlify.toml        # Netlify deployment config
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
```

Currently, SafePay AI runs entirely on-device and doesn't require external API keys.

### Webpack Configuration

The webpack config includes:
- TypeScript compilation
- CSS processing
- Production optimizations (minification, tree-shaking, code splitting)
- Source maps
- Console.log removal in production

## 🧪 Testing

The project uses Jest and React Testing Library for testing.

### Test Structure
- Unit tests: `src/client/**/__tests__/**/*.test.{ts,tsx}`
- Test setup: `src/setupTests.ts`

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 🔒 Security Features

- **Content Security Policy (CSP)** - Prevents XSS attacks
- **Input Sanitization** - All user inputs are sanitized
- **Secure Headers** - X-Frame-Options, X-Content-Type-Options, etc.
- **Wallet Signature Verification** - Cryptographic authentication
- **AES-256 Encryption** - Optional wallet-backed encryption

## 📊 Performance Optimizations

- **Code Splitting** - Automatic vendor and common chunk splitting
- **Lazy Loading** - Components loaded on demand
- **Asset Optimization** - Minified and compressed assets
- **Caching Strategy** - Long-term caching for static assets
- **Bundle Size Optimization** - Tree-shaking and dead code elimination

## 🐛 Troubleshooting

### Build Issues

**Error: Cannot find module**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors**
```bash
npm run build:dev
# Check for TypeScript errors in the output
```

### Wallet Connection Issues

- Ensure MetaMask or another Web3 wallet is installed
- Check that the wallet is unlocked
- Verify you're on a supported network

### Deployment Issues

- Ensure `NODE_ENV=production` is set in Netlify environment variables
- Check that the build command is `npm run build`
- Verify the publish directory is set to `dist`

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

## 🙏 Acknowledgments

- Built with React, TypeScript, and Web3 technologies
- Uses ethers.js for blockchain interactions
- Recharts for data visualization
- Tesseract.js for OCR capabilities (future feature)

---

**Made with ❤️ for privacy and decentralization**
