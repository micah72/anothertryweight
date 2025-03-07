import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import ProtectedRouteErrorBoundary from './ProtectedRouteErrorBoundary';

// Protected Route Component for Approved Users
const ApprovedUserRoute = ({ children, requiredPermission }) => {
  // Get auth context with safe fallbacks
  const auth = useAuth() || {};
  
  // Destructure with default values to prevent undefined errors
  const {
    user = null,
    loading = false,
  } = auth;
  
  // Use explicit boolean checks for boolean values
  const isAdmin = Boolean(auth.isAdmin);
  const isApproved = Boolean(auth.isApproved);
  
  // Safely access the hasPermission function
  const hasPermission = typeof auth.hasPermission === 'function' 
    ? auth.hasPermission 
    : () => false;
  
  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
        <p className="ml-2 text-gray-600">Loading authentication...</p>
      </div>
    );
  }
  
  // Authentication checks
  const isAuthenticated = Boolean(user);
  const hasRequiredAccess = isAdmin || isApproved;
  const hasRequiredPermission = !requiredPermission || isAdmin || hasPermission(requiredPermission);
  
  // Redirect logic based on authentication state
  if (!isAuthenticated) {
    console.log('ApprovedUserRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (!hasRequiredAccess) {
    console.log('ApprovedUserRoute: User not approved, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (!hasRequiredPermission) {
    console.log(`ApprovedUserRoute: User lacks permission: ${requiredPermission}`);
    return <Navigate to="/access-denied" replace />;
  }
  
  // If all checks pass, render the protected content wrapped in an error boundary
  return (
    <ProtectedRouteErrorBoundary>
      {children}
    </ProtectedRouteErrorBoundary>
  );
};

export default ApprovedUserRoute;
