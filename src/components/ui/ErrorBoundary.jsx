import React from 'react';
import Button from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1220] text-white px-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-blue-400">Oops!</h1>
              <h2 className="text-2xl font-semibold text-white">Something went wrong.</h2>
              <p className="text-gray-400 text-sm">
                An unexpected error occurred. Please try reloading the application.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={this.handleReload}
              className="shadow-md shadow-blue-500/20"
            >
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;