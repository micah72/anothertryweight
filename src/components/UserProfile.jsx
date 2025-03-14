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
  const [weightUnit, setWeightUnit] = useState('kg'); // Default to kg

  const { user, userRole, isAdmin } = useAuth();
  const userIsAdmin = isAdmin;

  // Weight conversion functions
  const kgToLb = (kg) => {
    if (!kg || isNaN(kg)) return '';
    return (parseFloat(kg) * 2.20462).toFixed(1);
  };

  const lbToKg = (lb) => {
    if (!lb || isNaN(lb)) return '';
    return (parseFloat(lb) / 2.20462).toFixed(1);
  };

  // Convert weight based on selected unit for display
  const displayWeight = (weightInKg) => {
    if (weightUnit === 'kg') return weightInKg;
    return kgToLb(weightInKg);
  };

  // Toggle between kg and lb
  const toggleWeightUnit = () => {
    const newUnit = weightUnit === 'kg' ? 'lb' : 'kg';
    setWeightUnit(newUnit);
    
    // Convert the existing weight values
    if (newUnit === 'lb') {
      setUserData({
        ...userData,
        weight: kgToLb(userData.weight),
        target_weight: kgToLb(userData.target_weight)
      });
    } else {
      setUserData({
        ...userData,
        weight: lbToKg(userData.weight),
        target_weight: lbToKg(userData.target_weight)
      });
    }

    // Save preference to localStorage
    localStorage.setItem('preferredWeightUnit', newUnit);
  };

  useEffect(() => {
    // Load user's preferred unit from localStorage
    const savedUnit = localStorage.getItem('preferredWeightUnit');
    if (savedUnit && (savedUnit === 'kg' || savedUnit === 'lb')) {
      setWeightUnit(savedUnit);
    }

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
        
        let userData = {
          age: user.age || '',
          height: user.height || '',
          weight: user.weight || '',
          target_weight: user.target_weight || '',
          gender: user.gender || 'male'
        };

        // Convert weight if lb is selected
        if (savedUnit === 'lb') {
          userData.weight = kgToLb(userData.weight);
          userData.target_weight = kgToLb(userData.target_weight);
        }

        setUserData(userData);
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
      // Convert weights to kg for storage if currently using lb
      let weightInKg = userData.weight;
      let targetWeightInKg = userData.target_weight;
      
      if (weightUnit === 'lb') {
        weightInKg = lbToKg(userData.weight);
        targetWeightInKg = lbToKg(userData.target_weight);
      }

      // Ensure all numeric values are properly converted
      const dataToUpdate = {
        age: parseInt(userData.age) || 0,
        height: parseFloat(userData.height) || 0,
        weight: parseFloat(weightInKg) || 0,
        target_weight: parseFloat(targetWeightInKg) || 0,
        gender: userData.gender
      };

      const updatedUser = dbService.updateUser(1, dataToUpdate);
      
      if (updatedUser) {
        // Convert back to display unit after save
        let updatedData = {
          age: updatedUser.age || '',
          height: updatedUser.height || '',
          weight: updatedUser.weight || '',
          target_weight: updatedUser.target_weight || '',
          gender: updatedUser.gender || 'male'
        };

        if (weightUnit === 'lb') {
          updatedData.weight = kgToLb(updatedData.weight);
          updatedData.target_weight = kgToLb(updatedData.target_weight);
        }

        setUserData(updatedData);
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
    <div className="max-w-6xl mx-auto p-4 md:p-6" style={{ backgroundColor: '#3d7fef', minHeight: 'calc(100vh - 5rem)' }}>
      <h1 className="text-2xl font-bold mb-6 text-white">Your Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - User details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Profile Information</h2>
              <button
                type="button"
                onClick={toggleWeightUnit}
                className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 focus:outline-none"
              >
                {weightUnit === 'kg' ? 'Switch to lbs' : 'Switch to kg'}
              </button>
            </div>
            
            {message && (
              <div className={`p-4 rounded-lg mb-6 ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={userData.gender}
                  onChange={(e) => setUserData({...userData, gender: e.target.value})}
                  className="block w-full px-4 py-2 rounded-md border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  value={userData.age}
                  onChange={(e) => setUserData({...userData, age: e.target.value})}
                  className="block w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="120"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={userData.height}
                  onChange={(e) => setUserData({...userData, height: e.target.value})}
                  className="block w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight ({weightUnit})</label>
                <input
                  type="number"
                  value={userData.weight}
                  onChange={(e) => setUserData({...userData, weight: e.target.value})}
                  className="block w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max={weightUnit === 'kg' ? "500" : "1100"}
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Weight ({weightUnit})</label>
                <input
                  type="number"
                  value={userData.target_weight}
                  onChange={(e) => setUserData({...userData, target_weight: e.target.value})}
                  className="block w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max={weightUnit === 'kg' ? "500" : "1100"}
                  step="0.1"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 transition duration-150 ease-in-out shadow-md mx-auto block"
              >
                {loading ? <LoadingSpinner /> : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Right column - Account information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Account Information</h2>
            
            <div className="flex flex-col space-y-5">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Email</span>
                <span className="font-medium text-gray-800">{user?.email}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Account Type</span>
                <span className="font-medium text-gray-800 capitalize">{userRole || 'Regular'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Member Since</span>
                <span className="font-medium text-gray-800">
                  {user?.metadata?.creationTime 
                    ? new Date(user.metadata.creationTime).toLocaleDateString() 
                    : 'Unknown'}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">Preferred Weight Unit</span>
                <span className="font-medium text-gray-800">{weightUnit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}</span>
              </div>
              
              {userIsAdmin && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    As an admin, you can manage user permissions from the Admin Dashboard.
                  </p>
                  <Link 
                    to="/admin-dashboard" 
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition duration-150 ease-in-out shadow-md"
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