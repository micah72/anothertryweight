import React, { useState, useEffect } from 'react';
import dbService from '../db/database';
import LoadingSpinner from './LoadingSpinner';

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
    <div className="max-w-2xl mx-auto p-4">
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
  );
};

export default UserProfile;