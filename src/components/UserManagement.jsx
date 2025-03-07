import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser as deleteFirebaseUser } from 'firebase/auth';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import authService from '../firebase/authService';
import { Users, Activity, ArrowUpRight, UserPlus, X, Eye, EyeOff, RefreshCw, Clipboard, Key, UserX } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [userRole, setUserRole] = useState('regular');
  const [processing, setProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginStats, setLoginStats] = useState({
    totalLogins: 0,
    activeUsers: 0,
    averageLoginsPerUser: 0,
    lastLoginDate: null
  });
  const { isAdmin } = useAuth();
  const userIsAdmin = isAdmin;
  const auth = getAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!userIsAdmin) {
      setError('You do not have permission to view users.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching users and their passwords...");
      
      // Fetch from users collection
      const usersRef = collection(db, 'users');
      const userSnapshot = await getDocs(usersRef);
      
      let usersList = [];
      
      // Process each user and check for password in waitlist
      for (const docSnapshot of userSnapshot.docs) {
        const userData = docSnapshot.data();
        
        // Check if user has a stored password directly
        let userWithPassword = {
          id: docSnapshot.id,
          ...userData,
          tempPassword: userData.tempPassword || null
        };
        
        // If the user has a waitlistId, check for a stored password there too
        if (userData.waitlistId) {
          try {
            const waitlistDoc = await getDoc(doc(db, 'waitlist', userData.waitlistId));
            if (waitlistDoc.exists()) {
              const waitlistData = waitlistDoc.data();
              if (waitlistData.tempPassword && !userWithPassword.tempPassword) {
                userWithPassword.tempPassword = waitlistData.tempPassword;
              }
              if (waitlistData.lastUsedPassword && !userWithPassword.tempPassword) {
                userWithPassword.tempPassword = waitlistData.lastUsedPassword;
              }
            }
          } catch (err) {
            console.error('Error fetching waitlist entry:', err);
          }
        }
        
        // Look in approved_users collection as well
        try {
          const approvedUserDoc = await getDoc(doc(db, 'approved_users', docSnapshot.id));
          if (approvedUserDoc.exists()) {
            const approvedData = approvedUserDoc.data();
            if (approvedData.tempPassword && !userWithPassword.tempPassword) {
              userWithPassword.tempPassword = approvedData.tempPassword;
            }
          }
        } catch (err) {
          console.error('Error fetching approved user:', err);
        }
        
        console.log(`User ${userData.email} password:`, userWithPassword.tempPassword || "Not found");
        usersList.push(userWithPassword);
      }
      
      // Sort users by creation date, latest first
      usersList.sort((a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      console.log(`Fetched ${usersList.length} users`);
      setUsers(usersList);
      calculateLoginStats(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    return authService.generateSecurePassword();
  };

  const openCreateModal = () => {
    setEmail('');
    setPassword(generatePassword());
    setConfirmPassword('');
    setName('');
    setUserRole('regular');
    setShowPassword(false);
    setShowCreateModal(true);
  };

  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setPassword(generatePassword());
    setShowPassword(false);
    setShowResetPasswordModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setSelectedUser(null);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password).then(() => {
      alert('Password copied to clipboard!');
    });
  };

  const refreshPassword = () => {
    setPassword(generatePassword());
  };

  const createUser = async (e) => {
    e.preventDefault();
    
    if (!email) {
      alert('Email is required');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      setProcessing(true);
      console.log(`Creating user with email: ${email}, password: ${password}`); // Debug log
      
      // Use our auth service to create the user
      const user = await authService.createUser(email, password, {
        name: name || '',
        role: userRole,
        isApproved: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      // Test if the credentials work
      const testResult = await authService.testCredentials(email, password);
      if (testResult.success) {
        console.log("Credentials verified successfully!");
      } else {
        console.error("Failed to verify credentials:", testResult.error);
        alert(`Warning: We created the user account but couldn't verify the password "${password}" works correctly. Please note it down carefully and test it.`);
      }
      
      alert(`User ${email} created successfully with password: ${password}\n\nPlease note this password down securely.`);
      
      // Close modal and refresh user list
      setShowCreateModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Error creating user: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !selectedUser.email) {
      alert('No user selected');
      return;
    }
    
    try {
      setProcessing(true);
      
      // Since Firebase client SDK cannot directly reset passwords for other users,
      // we'll try creating a new user with the same email and delete the old one,
      // which will work if the user is only in Firebase Auth and not already logged in elsewhere
      
      // First, try creating a new user with the same email
      try {
        // Use our auth service to create a user with the same email
        const user = await authService.createUser(selectedUser.email, password, {
          name: selectedUser.name || '',
          role: selectedUser.role || 'regular',
          isApproved: true,
          updated_at: new Date().toISOString(),
          tempPassword: password,
          passwordCreatedAt: new Date().toISOString(),
          previousUid: selectedUser.id
        });
        
        // Test if the new credentials work
        const testResult = await authService.testCredentials(selectedUser.email, password);
        if (testResult.success) {
          console.log("New credentials verified successfully!");
          alert(`Password for ${selectedUser.email} has been reset to: ${password}\n\nThis password has been tested and works for login.`);
          
          // Close modal and refresh user list
          setShowResetPasswordModal(false);
          setSelectedUser(null);
          fetchUsers();
        } else {
          throw new Error("Created user but credentials don't work");
        }
      } catch (createError) {
        console.error('Error recreating user:', createError);
        
        // Fallback: If we can't recreate the user, update their password in Firestore
        // and ask them to use the "Forgot Password" feature
        
        // Update password in users collection
        await updateDoc(doc(db, 'users', selectedUser.id), {
          tempPassword: password,
          passwordCreatedAt: new Date().toISOString(),
          password_reset_at: new Date().toISOString()
        });
        
        // Also update in approved_users collection
        try {
          const approvedUserRef = doc(db, 'approved_users', selectedUser.id);
          const approvedUserDoc = await getDoc(approvedUserRef);
          if (approvedUserDoc.exists()) {
            await updateDoc(approvedUserRef, {
              tempPassword: password,
              passwordCreatedAt: new Date().toISOString(),
              password_reset_at: new Date().toISOString()
            });
          }
        } catch (error) {
          console.log("No record found in approved_users or error updating:", error);
        }
        
        // Send a password reset email and show instructions
        try {
          await authService.resetPassword(selectedUser.email);
          alert(`Could not reset password directly for ${selectedUser.email}.\n\nWe've sent a password reset email to the user's email address. Please ask them to check their inbox and follow the instructions to reset their password.`);
        } catch (resetError) {
          console.error('Error sending password reset email:', resetError);
          alert(`Could not reset password for ${selectedUser.email}.\n\nPlease ask the user to use the "Forgot Password" feature on the login page to reset their password themselves.`);
        }
        
        // Close modal and refresh user list
        setShowResetPasswordModal(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(`Error resetting password: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete from users collection
      await deleteDoc(doc(db, 'users', userId));
      
      // Note: We can't delete the Firebase Auth user directly from client SDK
      // This would require Firebase Admin SDK via Cloud Functions
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      
      alert('User removed from the database. Note: The Firebase Authentication account still exists.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Error deleting user: ${error.message}`);
    }
  };

  // Calculate login statistics from user data
  const calculateLoginStats = (usersList) => {
    if (!usersList || usersList.length === 0) return;
    
    let totalLogins = 0;
    let activeUsers = 0;
    let latestLogin = null;
    
    usersList.forEach(user => {
      // Count total logins
      totalLogins += user.loginCount || 0;
      
      // Count users who have logged in at least once
      if (user.loginCount && user.loginCount > 0) {
        activeUsers++;
      }
      
      // Find the most recent login
      if (user.lastLoginAt) {
        const loginDate = new Date(user.lastLoginAt);
        if (!latestLogin || loginDate > latestLogin) {
          latestLogin = loginDate;
        }
      }
    });
    
    setLoginStats({
      totalLogins,
      activeUsers,
      averageLoginsPerUser: activeUsers > 0 ? (totalLogins / activeUsers).toFixed(1) : 0,
      lastLoginDate: latestLogin
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* Login Statistics */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 bg-blue-50">
          <h3 className="text-lg leading-6 font-medium text-blue-900 flex items-center">
            <Activity className="mr-2" size={20} /> Login Statistics
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-blue-700">
            Overview of user login activity for scaling and cost planning
          </p>
        </div>
        
        <div className="border-t border-gray-200">
          <dl>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
              <div className="bg-indigo-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-indigo-700 truncate">
                  Total Logins
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-indigo-900">
                  {loginStats.totalLogins}
                </dd>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-green-700 truncate">
                  Active Users
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-green-900">
                  {loginStats.activeUsers} <span className="text-sm font-normal">of {users.length}</span>
                </dd>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-yellow-700 truncate">
                  Avg. Logins per User
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-yellow-900">
                  {loginStats.averageLoginsPerUser}
                </dd>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-purple-700 truncate">
                  Most Recent Login
                </dt>
                <dd className="mt-1 text-lg font-semibold text-purple-900">
                  {loginStats.lastLoginDate ? loginStats.lastLoginDate.toLocaleString() : 'No logins yet'}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage user accounts and access
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const passwordsInfo = users
                  .filter(user => user.tempPassword)
                  .map(user => `${user.email}: ${user.tempPassword}`)
                  .join('\n');
                
                if (passwordsInfo) {
                  console.log("User passwords:", passwordsInfo);
                  alert(`User Passwords:\n\n${passwordsInfo}`);
                } else {
                  alert("No stored passwords found for any users.");
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Show All Passwords
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create User
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Login Count
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 font-medium text-lg">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.name || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role || 'regular'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isApproved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.created_at ? (
                        <span className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.loginCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.tempPassword ? (
                        <div className="flex items-center space-x-1">
                          <span className="font-mono text-xs bg-gray-100 p-1 rounded border border-gray-300">
                            {user.tempPassword}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(user.tempPassword);
                              alert(`Password copied to clipboard!`);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 italic">Not available</span>
                          <button
                            onClick={() => openResetPasswordModal(user)}
                            className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                            title="Reset Password"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Reset Password
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
              <button 
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={createUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                  >
                    <option value="regular">Regular User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="createPassword" className="block text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="createPassword"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={refreshPassword}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generate Password
                  </button>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 space-y-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating User...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal - Enhance it */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Password for {selectedUser.email}</h3>
              <button 
                onClick={closeResetPasswordModal}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Important Password Information
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      This is either the last known password or a newly generated one. Share it securely with the user.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="block w-full p-2 border border-gray-300 rounded-md text-lg font-mono bg-white"
                    value={password}
                    readOnly
                  />
                  <button
                    type="button"
                    className="ml-2 p-2 text-gray-400 hover:text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={refreshPassword}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generate New
                  </button>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy Password
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>Instructions for the user:</p>
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                  <li>Log in with the email: <strong>{selectedUser.email}</strong></li>
                  <li>Use this password (shown above)</li>
                  <li>Instruct them to use the "Forgot Password" link if they need to change it</li>
                </ol>
              </div>
            </div>

            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                onClick={closeResetPasswordModal}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 