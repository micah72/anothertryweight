import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import dbService from '../firebase/dbService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userRole, setUserRole] = useState('regular');
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAdmin } = useAuth();
  
  // Check if the registration is being done by an admin (from admin dashboard)
  const isAdminCreating = location.state?.adminCreating || false;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);
      
      // If not admin creating, check if the email is in the approved waitlist
      let shouldAutoApprove = isAdminCreating ? isApproved : false;
      let approvedUserData = null;
      let waitlistEntryId = null;
      
      if (!isAdminCreating) {
        // Check if this email is in the approved_users collection
        const approvedUsersQuery = query(
          collection(db, 'approved_users'),
          where('email', '==', email)
        );
        const approvedSnapshot = await getDocs(approvedUsersQuery);
        
        if (!approvedSnapshot.empty) {
          // Email found in approved_users
          approvedUserData = approvedSnapshot.docs[0].data();
          shouldAutoApprove = true;
        } else {
          // Check if this email is in the waitlist with status 'approved'
          const waitlistQuery = query(
            collection(db, 'waitlist'),
            where('email', '==', email),
            where('status', '==', 'approved')
          );
          const waitlistSnapshot = await getDocs(waitlistQuery);
          
          if (!waitlistSnapshot.empty) {
            // Email found in approved waitlist
            const waitlistData = waitlistSnapshot.docs[0].data();
            waitlistEntryId = waitlistSnapshot.docs[0].id;
            shouldAutoApprove = true;
          }
        }
      }
      
      // Create the user account
      const userCredential = await register(email, password);
      
      // Create user profile in Firestore (in the new users collection)
      await dbService.updateDoc(`users/${userCredential.user.uid}`, {
        email,
        userId: userCredential.user.uid,
        role: isAdminCreating ? userRole : 'regular', // Regular signup always creates regular users
        isApproved: shouldAutoApprove,
        created_at: new Date().toISOString(),
        settings: {
          dailyCalorieTarget: 2000,
          weightUnit: 'kg',
          heightUnit: 'cm'
        }
      });
      
      // For backward compatibility, also update the approved_users collection
      if (shouldAutoApprove) {
        await dbService.updateDoc(`approved_users/${userCredential.user.uid}`, {
          email,
          userId: userCredential.user.uid,
          isApproved: true,
          created_at: new Date().toISOString()
        });
        
        // If this was from a waitlist entry, update the waitlist entry with the new user ID
        if (waitlistEntryId) {
          await dbService.updateDoc(`waitlist/${waitlistEntryId}`, {
            uid: userCredential.user.uid,
            status: 'registered'
          });
        }
      }

      // Redirect to admin dashboard if admin was creating the user, otherwise home
      if (isAdminCreating) {
        navigate('/admin-dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to create an account. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isAdminCreating ? 'Create New User' : 'Create your account'}
          </h2>
          {isAdminCreating && (
            <p className="mt-2 text-center text-sm text-gray-600">
              As an admin, you can set user roles and approval status
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            {/* Role selection (only shown for admin) */}
            {isAdminCreating && (
              <>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    User Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  >
                    <option value="regular">Regular User</option>
                    <option value="admin">Admin</option>
                    {/* Add more roles as needed */}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    id="approved"
                    name="approved"
                    type="checkbox"
                    checked={isApproved}
                    onChange={(e) => setIsApproved(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="approved" className="ml-2 block text-sm text-gray-900">
                    Approve user immediately
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="text-sm text-center">
            <Link 
              to="/login" 
              className="font-medium text-primary hover:text-primary/80"
            >
              Already have an account? Sign in
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : (isAdminCreating ? 'Create User' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;