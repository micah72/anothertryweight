import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SimpleAdminDashboard = () => {
  const { logout, user } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="admin-dashboard w-full bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Logout
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Admin Information</h2>
            <div className="space-y-2">
              <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
              <p><strong>User ID:</strong> {user?.uid || 'Not available'}</p>
              <p><strong>Status:</strong> <span className="text-green-600">Active (Admin)</span></p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <p>This is a simplified admin dashboard. The main dashboard may be experiencing issues.</p>
              <div className="mt-4 flex flex-col space-y-2">
                <Link to="/" className="bg-blue-600 text-white text-center hover:bg-blue-700 px-4 py-2 rounded-md font-medium transition-colors duration-200">
                  Go to Home Page
                </Link>
                <button onClick={handleLogout} className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md font-medium transition-colors duration-200">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdminDashboard; 