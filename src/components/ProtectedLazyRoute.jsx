import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';



/**
 * ProtectedLazyRoute - A simplified component that handles authentication protection for lazy-loaded components
 * 
 * This component handles:
 * 1. Authentication checks (user logged in, admin status, approval status)
 * 2. Permission checks
 * 3. Rendering the protected component
 */
const ProtectedLazyRoute = ({ component: Component, requiredPermission }) => {
  // Access auth context
  const { user, isAdmin, isApproved, hasPermission } = useAuth();
  
  // Development mode bypass for testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  const bypassAuth = isDevelopment && localStorage.getItem('devModeBypass') === 'true';
  
  // Authentication checks
  const isAuthenticated = bypassAuth || Boolean(user);
  const hasRequiredAccess = bypassAuth || isAdmin || isApproved;
  const hasRequiredPermission = bypassAuth || !requiredPermission || isAdmin || (hasPermission && hasPermission(requiredPermission));
  
  // Redirect logic based on authentication state
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasRequiredAccess) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasRequiredPermission) {
    return <Navigate to="/access-denied" replace />;
  }
  
  // If all checks pass, render the component
  return <Component />;
};

export default ProtectedLazyRoute;
