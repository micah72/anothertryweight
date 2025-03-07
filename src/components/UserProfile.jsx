import React, { useState, useEffect } from 'react';
import dbService from '../db/database';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const UserProfile = () => {
  const [userData, setUserData] = useState({
    age: '',
    height: '',
    weight: '',
    target_weight: '',
    gender: 'male'
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const { user, userRole, isAdmin } = useAuth();
  const userIsAdmin = isAdmin;

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        let user = dbService.getUser(1);
        
        if (!user) {
          // Create default user if none exists
          const defaultUser = {
            id: 1,
            age: 30,
            height: 170,
            weight: 70,
            target_weight: 65,
            gender: 'male'
          };
          user = dbService.createUser(defaultUser);
          setMessage('Default profile created. Please update your information.');
        }
        
        setUserData({
          age: user.age || '',
          height: user.height || '',
          weight: user.weight || '',
          target_weight: user.target_weight || '',
          gender: user.gender || 'male'
        });
      } catch (error) {
        console.error('Error loading user data:', error);
        setMessage('Error loading profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure all numeric values are properly converted
      const dataToUpdate = {
        age: parseInt(userData.age) || 0,
        height: parseFloat(userData.height) || 0,
        weight: parseFloat(userData.weight) || 0,
        target_weight: parseFloat(userData.target_weight) || 0,
        gender: userData.gender
      };

      const updatedUser = dbService.updateUser(1, dataToUpdate);
      
      if (updatedUser) {
        setUserData({
          age: updatedUser.age || '',
          height: updatedUser.height || '',
          weight: updatedUser.weight || '',
          target_weight: updatedUser.target_weight || '',
          gender: updatedUser.gender || 'male'
        });
        setMessage('Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      setMessage('Error saving profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - User details */}
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
          
          {message && (
            <div className={`p-4 rounded-lg mb-4 ${
              message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                value={userData.gender}
                onChange={(e) => setUserData({...userData, gender: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <input
                type="number"
                value={userData.age}
                onChange={(e) => setUserData({...userData, age: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                min="1"
                max="120"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
              <input
                type="number"
                value={userData.height}
                onChange={(e) => setUserData({...userData, height: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                min="1"
                max="300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
              <input
                type="number"
                value={userData.weight}
                onChange={(e) => setUserData({...userData, weight: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                min="1"
                max="500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Target Weight (kg)</label>
              <input
                type="number"
                value={userData.target_weight}
                onChange={(e) => setUserData({...userData, target_weight: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                min="1"
                max="500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner /> : 'Save Profile'}
            </button>
          </form>
        </div>
        
        {/* Right column - Account information */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            
            <div className="flex flex-col space-y-4">
              <div>
                <span className="text-gray-600 font-medium">Email:</span>
                <span className="ml-2">{user?.email}</span>
              </div>
              
              <div>
                <span className="text-gray-600 font-medium">Account Type:</span>
                <span className="ml-2 capitalize">{userRole || 'Regular'}</span>
              </div>
              
              <div>
                <span className="text-gray-600 font-medium">Member Since:</span>
                <span className="ml-2">
                  {user?.metadata?.creationTime 
                    ? new Date(user.metadata.creationTime).toLocaleDateString() 
                    : 'Unknown'}
                </span>
              </div>
              
              {userIsAdmin && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    As an admin, you can manage user permissions from the Admin Dashboard.
                  </p>
                  <Link 
                    to="/admin-dashboard" 
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                  >
                    Go to Admin Dashboard
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;