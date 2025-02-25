import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Protected Route Component for Admin
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  
  // If still loading auth state, show nothing
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  // If not logged in or not admin, redirect to admin login
  if (!user || !isAdmin) {
    return <Navigate to="/admin-login" />;
  }
  
  // If admin, show the protected content
  return children;
};

export default AdminRoute;
