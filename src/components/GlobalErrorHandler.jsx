import React from 'react';

class GlobalErrorHandler extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      componentStack: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('GlobalErrorHandler caught an error:', error);
    console.error('Component stack trace:', errorInfo.componentStack);
    
    // Update state with error details for rendering
    this.setState({
      errorInfo,
      componentStack: errorInfo.componentStack
    });
    
    // You could also log the error to an error reporting service here
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary p-6 bg-red-50 border border-red-300 rounded-md">
          <h2 className="text-xl font-semibold text-red-800 mb-3">Something went wrong</h2>
          <p className="text-md text-red-700 mb-2">
            {this.state.error?.message || "An unknown error occurred"}
          </p>
          
          {this.state.componentStack && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-red-700 mb-2">Error Details:</h3>
              <pre className="bg-red-100 p-3 rounded text-sm overflow-auto max-h-40 text-red-800">
                {this.state.componentStack}
              </pre>
            </div>
          )}
          
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { GlobalErrorHandler };
