/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly messages
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container">
          <div className="card alert alert-error">
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred. Please try refreshing the page.</p>
            {this.state.error && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Error details</summary>
                <pre style={{ 
                  padding: 12, 
                  background: 'var(--color-charcoal)', 
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'auto',
                  fontSize: 12
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div style={{ marginTop: 16 }}>
              <button className="btn" onClick={this.handleReset}>
                Try Again
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => window.location.reload()}
                style={{ marginLeft: 8 }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

