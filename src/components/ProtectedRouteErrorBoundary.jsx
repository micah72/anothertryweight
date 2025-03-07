import React from 'react';
import { Link } from 'react-router-dom';

class ProtectedRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Protected route error:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs in a protected route
      return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
            <p className="text-gray-700 mb-4">
              We encountered an issue with your authentication. This could be due to:
            </p>
            <ul className="list-disc pl-5 mb-6 text-gray-600">
              <li>Your session has expired</li>
              <li>You don't have permission to access this page</li>
              <li>There was a technical issue with the authentication system</li>
            </ul>
            <div className="flex flex-col space-y-3">
              <Link 
                to="/login" 
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-center"
              >
                Go to Login
              </Link>
              <Link 
                to="/" 
                className="border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-100 text-center"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ProtectedRouteErrorBoundary;
