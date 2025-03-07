import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

const AccessDeniedPage = () => {
  const { user, userRole } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-lg shadow-md">
        <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500" />
        
        <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
        
        <div className="mt-4 text-gray-600">
          <p className="mb-4">
            You don't have the necessary permissions to access this page.
          </p>
          
          {user && (
            <p className="text-sm text-gray-500">
              Current role: <span className="font-medium">{userRole || 'Unknown'}</span>
            </p>
          )}
        </div>
        
        <div className="mt-8 space-y-4">
          <Link
            to="/"
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Return to Home
          </Link>
          
          <Link
            to="/profile"
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Go to Your Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage; 