import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('Bridge Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-center">
            <div className="text-xs mb-3">⚠️</div>
            <h3 className="text-xs font-semibold text-red-800 mb-2">Something went wrong</h3>
            <p className="text-xs text-red-600 mb-3">
              The bridge interface encountered an error. Please try refreshing the page.
            </p>

            {this.state.error && (
              <details className="text-left bg-red-100 rounded p-3 mb-3">
                <summary className="text-xs font-medium text-red-800 cursor-pointer">
                  Error Details
                </summary>
                <div className="mt-2 text-xs text-red-700">
                  <div className="font-mono break-words">
                    {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div className="mt-2 font-mono text-xs">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-red-600 text-white px-3 py-2.5 rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white px-3 py-2.5 rounded hover:bg-gray-700 transition-colors"
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