import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Protected Route Component for Approved Users
const ApprovedUserRoute = ({ children }) => {
  const { user, isApproved, isAdmin, loading } = useAuth();
  
  // If still loading auth state, show nothing
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  // If not logged in or not approved (and not admin), redirect to login
  if (!user || (!isApproved && !isAdmin)) {
    return <Navigate to="/login" />;
  }
  
  // If approved user or admin, show the protected content
  return children;
};

export default ApprovedUserRoute;
