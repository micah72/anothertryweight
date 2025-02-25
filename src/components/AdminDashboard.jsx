import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import WaitlistTable from './WaitlistTable';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const AdminDashboard = () => {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [todaySignups, setTodaySignups] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [statsError, setStatsError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    const fetchWaitlistStats = async () => {
      try {
        setLoading(true);
        setStatsError(null);
        
        // Get total waitlist count
        const waitlistQuery = query(
          collection(db, 'waitlist'),
          orderBy('timestamp', 'desc')
        );
        const waitlistSnapshot = await getDocs(waitlistQuery);
        setWaitlistCount(waitlistSnapshot.size);
        
        // Calculate today's signups
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let todayCount = 0;
        waitlistSnapshot.forEach(doc => {
          const timestamp = doc.data().timestamp?.toDate();
          if (timestamp && timestamp >= today) {
            todayCount++;
          }
        });
        
        setTodaySignups(todayCount);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching waitlist stats:', error);
        setStatsError(error.message || 'Failed to load waitlist statistics');
        setLoading(false);
      }
    };
    
    fetchWaitlistStats();
  }, [isAdmin, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const retryFetchStats = () => {
    setStatsError(null);
    setLoading(true);
    
    const fetchStats = async () => {
      try {
        // Get total waitlist count
        const waitlistQuery = query(
          collection(db, 'waitlist'),
          orderBy('timestamp', 'desc')
        );
        const waitlistSnapshot = await getDocs(waitlistQuery);
        setWaitlistCount(waitlistSnapshot.size);
        
        // Calculate today's signups
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let todayCount = 0;
        waitlistSnapshot.forEach(doc => {
          const timestamp = doc.data().timestamp?.toDate();
          if (timestamp && timestamp >= today) {
            todayCount++;
          }
        });
        
        setTodaySignups(todayCount);
        setStatsError(null);
      } catch (error) {
        console.error('Error retrying stats fetch:', error);
        setStatsError(error.message || 'Failed to load waitlist statistics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
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

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('waitlist')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'waitlist'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Waitlist Management
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="stats-card">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Waitlist Statistics</h3>
              {statsError ? (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                  <p className="font-bold">Error loading statistics</p>
                  <p>{statsError}</p>
                  <button 
                    onClick={retryFetchStats}
                    className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="slide-in">
                    <p className="stats-label">Total Signups</p>
                    <p className="stats-number">{waitlistCount}</p>
                  </div>
                  <div className="slide-in" style={{animationDelay: '0.1s'}}>
                    <p className="stats-label">Today's Signups</p>
                    <p className="stats-number">{todaySignups}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="stats-card">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">User Activity</h3>
              <div className="space-y-4">
                <div className="slide-in">
                  <p className="stats-label">Active Users</p>
                  <p className="stats-number">587</p>
                </div>
                <div className="slide-in" style={{animationDelay: '0.1s'}}>
                  <p className="stats-label">New Today</p>
                  <p className="stats-number">12</p>
                </div>
              </div>
            </div>

            <div className="stats-card">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Content Overview</h3>
              <div className="space-y-4">
                <div className="slide-in">
                  <p className="stats-label">Food Images</p>
                  <p className="stats-number">1,280</p>
                </div>
                <div className="slide-in" style={{animationDelay: '0.1s'}}>
                  <p className="stats-label">Meal Plans</p>
                  <p className="stats-number">324</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'waitlist' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Waitlist Management</h2>
              <p className="text-gray-600 mb-4">
                View and manage all users who have signed up for the waitlist.
              </p>
              <WaitlistTable />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
