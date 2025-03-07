import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';

// Protected Route Component for Admin
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  const [error, setError] = useState(null);
  
  console.log('AdminRoute - user:', user);
  console.log('AdminRoute - isAdmin exists:', !!isAdmin);
  console.log('AdminRoute - isAdmin result:', isAdmin);
  
  // If still loading auth state, show loading spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
        <p className="ml-2 text-gray-600">Loading...</p>
      </div>
    );
  }
  
  // If not logged in or not admin, redirect to admin login
  if (!user || !isAdmin) {
    console.log('AdminRoute - Redirecting to admin login');
    return <Navigate to="/admin-login" />;
  }
  
  // Provide fallback content in case the children don't render properly
  try {
    // If admin, show the protected content
    console.log('AdminRoute - Showing admin content');
    return (
      <ErrorBoundary fallback={
        <div className="admin-dashboard w-full bg-gray-50 min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <Link to="/"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md font-medium transition-colors duration-200"
              >
                Back to Home
              </Link>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Admin Dashboard</h2>
              <p className="text-gray-600 mb-4">
                There was an issue loading the dashboard components.
              </p>
              <p className="text-gray-600">
                Please try refreshing the page or contact support if the issue persists.
              </p>
            </div>
          </div>
        </div>
      }>
        {children}
      </ErrorBoundary>
    );
  } catch (err) {
    console.error('Error in AdminRoute:', err);
    setError(err);
    return (
      <div className="admin-dashboard w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <Link to="/"
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md font-medium transition-colors duration-200"
            >
              Back to Home
            </Link>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">
              {error?.message || 'There was an error loading the dashboard.'}
            </p>
          </div>
        </div>
      </div>
    );
  }
};

export default AdminRoute;
