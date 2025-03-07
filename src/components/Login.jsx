import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAdmin, isApproved, user, resetPassword, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      console.log(`Attempting login for user: ${email}`);
      
      await login(email, password);
      console.log('Login successful');
      
      // The redirect will happen in the useEffect below
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        console.error('Authentication error: Invalid credentials or user not found');
        setError(`Invalid email or password. If you've forgotten your password, please use the "Forgot Password" link below.`);
      } else if (error.code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact an administrator.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many unsuccessful login attempts. Please try again later or reset your password.');
      } else if (error.message && error.message.includes('not been approved')) {
        setError(error.message);
      } else {
        setError(error.message || 'Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    
    try {
      setResetLoading(true);
      setError('');
      
      await resetPassword(resetEmail);
      setSuccess(`Password reset email sent to ${resetEmail}. Check your inbox for further instructions.`);
      setShowForgotPassword(false);
      
      // Clear the reset email field
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('No account found with that email address.');
      } else {
        setError(`Error sending password reset email: ${error.message}`);
      }
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    // Only run this effect when we have a user and authentication state is determined
    if (!user || loading) return;
    
    const checkUserStatus = () => {
      console.log('Login: User authentication state check');
      console.log('- User:', user?.email);
      console.log('- isAdmin:', isAdmin);
      console.log('- isApproved:', isApproved);
      
      // Clear any previous errors when successfully logged in
      setError('');
      
      // Redirect based on user role
      if (isAdmin) {
        console.log('Login: Redirecting to admin dashboard');
        navigate('/admin-dashboard');
      } else if (isApproved) {
        console.log('Login: Redirecting to gallery');
        navigate('/gallery');
      } else {
        console.log('Login: User not approved');
        setError('Your account has not been approved yet. If you believe this is in error, please contact the administrator.');
        // Only logout if this is a real user, not our dev user
        if (user?.email !== 'dev@example.com') {
          logout();
        }
      }
    };
    
    // Execute the check
    checkUserStatus();
    
  }, [user, isAdmin, isApproved, loading, navigate, logout]);

  // Development mode login helper - available in any environment for testing
  const handleDevLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await login('dev@example.com', 'devmode');
      console.log('Development mode login successful');
    } catch (error) {
      console.error('Development login error:', error);
      setError('Development mode login failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        <div className="mt-2 text-center">
          <button 
            onClick={handleDevLogin}
            className="text-sm bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1 rounded-md"
            disabled={loading}
          >
            Quick Login (Testing Only)
          </button>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Show success message if exists */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md">
              <p>{success}</p>
            </div>
          )}
          
          {/* Show error message if exists */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md flex">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {/* Forgot Password Form */}
          {showForgotPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mb-5">
                <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p>If this is your first time logging in or an admin created your account, use the temporary password provided to you.</p>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmail(email); // Pre-fill the reset email with the login email
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;