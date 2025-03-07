import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import WaitlistTable from './WaitlistTable';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ChevronRight, UserPlus, Shield, Users } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import UserPermissionsManager from './UserPermissionsManager';
import UserManagement from './UserManagement';
import { getAuth } from 'firebase/auth';

const AdminDashboard = () => {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [todaySignups, setTodaySignups] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [statsError, setStatsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const userIsAdmin = isAdmin;
  
  console.log('AdminDashboard - mounting, userIsAdmin:', userIsAdmin);

  const setTabAndInitializeUser = (tab) => {
    setActiveTab(tab);
    
    // If switching to permissions tab and no user is selected, try to select the current admin user
    if (tab === 'permissions' && !selectedUser && users.length > 0) {
      // Find the current admin user
      const adminUser = users.find(user => user.role === 'admin');
      if (adminUser) {
        setSelectedUser(adminUser);
      }
    }
  };

  useEffect(() => {
    // Redirect if not admin
    console.log('AdminDashboard useEffect - userIsAdmin:', userIsAdmin);
    if (!userIsAdmin) {
      console.log('AdminDashboard - Not admin, redirecting to home');
      navigate('/');
      return;
    }
    
    console.log('AdminDashboard - Starting to fetch waitlist stats');
    // Fetch stats even if there's an error to show at least the tabs
    fetchWaitlistStats().catch(err => {
      console.error('Error in initial waitlist stats fetch:', err);
      setStatsError(err.message || 'Failed to load waitlist statistics');
      setLoading(false);
    });

    // Fetch users to ensure they're available when switching to the permissions tab
    fetchUsers();
  }, [userIsAdmin, navigate]);

  // Add another useEffect to fetch users when the active tab changes to users or permissions
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'permissions') {
      fetchUsers();
    }
  }, [activeTab]);

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

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // First, get all users from Firebase Auth
      const auth = getAuth();
      const userListResult = await auth.listUsers ? auth.listUsers() : { users: [] };
      
      // If listUsers is not available in client SDK, fetch from Firestore users collection
      const usersCollectionRef = collection(db, 'users');
      const userSnapshot = await getDocs(usersCollectionRef);
      
      const firestoreUsers = {};
      userSnapshot.forEach(doc => {
        firestoreUsers[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });
      
      // Fetch users from approved_users collection for backward compatibility
      const approvedUsersRef = collection(db, 'approved_users');
      const approvedSnapshot = await getDocs(approvedUsersRef);
      
      const approvedUsers = {};
      approvedSnapshot.forEach(doc => {
        approvedUsers[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });
      
      // Combine all users and ensure they exist in the users collection
      const allUsers = [];
      const batchUpdates = [];
      
      // Create permissions object for admin users
      const allPermissionsForAdmin = {
        basic_features: true,
        track_weight: true,
        view_recommendations: true,
        view_admin_dashboard: true,
        manage_users: true,
        manage_permissions: true,
        access_all_features: true
      };
      
      // Add all Firestore users first
      for (const uid in firestoreUsers) {
        const userData = firestoreUsers[uid];
        allUsers.push(userData);
        
        // If user is an admin, ensure they have all permissions
        if (userData.role === 'admin' && (!userData.permissions || Object.keys(userData.permissions).length === 0)) {
          batchUpdates.push({
            uid,
            data: {
              permissions: allPermissionsForAdmin,
              updated_at: new Date().toISOString()
            }
          });
        }
      }
      
      // Add any users from approved_users that don't exist in users collection
      for (const uid in approvedUsers) {
        if (!firestoreUsers[uid]) {
          const userData = {
            id: uid,
            email: approvedUsers[uid].email,
            isApproved: approvedUsers[uid].isApproved === true,
            role: 'regular',
            created_at: approvedUsers[uid].approvedAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          allUsers.push(userData);
          
          // Queue update to add this user to users collection
          batchUpdates.push({
            uid,
            data: userData
          });
        }
      }
      
      // Check for the hardcoded admin user
      const adminId = 'zFl7YxQw6CaP4ZJPthcvgGq2Rld2';
      let adminExists = false;
      
      for (const user of allUsers) {
        if (user.id === adminId) {
          adminExists = true;
          // Ensure the role is set to admin
          if (user.role !== 'admin') {
            user.role = 'admin';
            user.isApproved = true;
            
            // Queue update to users collection
            batchUpdates.push({
              uid: adminId,
              data: {
                role: 'admin',
                isApproved: true,
                permissions: allPermissionsForAdmin,
                updated_at: new Date().toISOString()
              }
            });
          } 
          // Ensure admin has all permissions
          else if (!user.permissions || Object.keys(user.permissions).length === 0) {
            batchUpdates.push({
              uid: adminId,
              data: {
                permissions: allPermissionsForAdmin,
                updated_at: new Date().toISOString()
              }
            });
          }
          break;
        }
      }
      
      // If admin user doesn't exist in our lists, add it manually
      if (!adminExists) {
        const adminUser = {
          id: adminId,
          email: 'admin@example.com', // Default email, will be updated below if possible
          role: 'admin',
          isApproved: true,
          permissions: allPermissionsForAdmin,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        allUsers.push(adminUser);
        
        // Queue update
        batchUpdates.push({
          uid: adminId,
          data: adminUser
        });
      }
      
      // Process all the batched updates to users collection
      for (const update of batchUpdates) {
        try {
          const userRef = doc(db, 'users', update.uid);
          await setDoc(userRef, update.data, { merge: true });
        } catch (err) {
          console.error(`Error updating user ${update.uid}:`, err);
        }
      }
      
      // Sort users by creation date
      allUsers.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA; // Most recent first
      });
      
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const updateUserStatus = async (userId, updates) => {
    try {
      // Update the user in the users collection
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      // Also update in approved_users if needed (for backward compatibility)
      if ('isApproved' in updates) {
        const approvedUserRef = doc(db, 'approved_users', userId);
        if (updates.isApproved) {
          // Add or update the user in approved_users collection
          await setDoc(approvedUserRef, {
            isApproved: true,
            updated_at: new Date().toISOString()
          }, { merge: true });
        } else {
          // Mark as not approved in approved_users
          await setDoc(approvedUserRef, {
            isApproved: false,
            updated_at: new Date().toISOString()
          }, { merge: true });
        }
      }
      
      // Refresh the users list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };
  
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
      return true;
    } catch (error) {
      console.error('Error fetching waitlist stats:', error);
      setStatsError(error.message || 'Failed to load waitlist statistics');
      setLoading(false);
      throw error;
    }
  };

  return (
    <div className="admin-dashboard w-full bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg leading-6 font-medium text-gray-900 mb-2 md:mb-0">
              Admin Dashboard
            </h2>
            
            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  if (!window.confirm('This will scan the database for all stored passwords and update user records. Continue?')) {
                    return;
                  }
                  
                  try {
                    const { db } = await import('../firebase/config');
                    const { collection, getDocs, doc, getDoc, updateDoc, setDoc } = await import('firebase/firestore');
                    
                    // Get all users
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const users = [];
                    usersSnapshot.forEach(doc => {
                      users.push({
                        id: doc.id,
                        ...doc.data()
                      });
                    });
                    
                    console.log(`Found ${users.length} users to check`);
                    
                    // Get all waitlist entries
                    const waitlistSnapshot = await getDocs(collection(db, 'waitlist'));
                    const waitlistEntries = [];
                    waitlistSnapshot.forEach(doc => {
                      waitlistEntries.push({
                        id: doc.id,
                        ...doc.data()
                      });
                    });
                    
                    console.log(`Found ${waitlistEntries.length} waitlist entries to check`);
                    
                    // Get all approved users
                    const approvedUsersSnapshot = await getDocs(collection(db, 'approved_users'));
                    const approvedUsers = [];
                    approvedUsersSnapshot.forEach(doc => {
                      approvedUsers.push({
                        id: doc.id,
                        ...doc.data()
                      });
                    });
                    
                    console.log(`Found ${approvedUsers.length} approved users to check`);
                    
                    // Track fixed users
                    const fixedUsers = [];
                    
                    // Check and update each user
                    for (const user of users) {
                      let password = null;
                      
                      // Check if user already has a password
                      if (user.tempPassword) {
                        console.log(`User ${user.email} already has password: ${user.tempPassword}`);
                        continue;
                      }
                      
                      // Try to find password in approved_users
                      const approvedUser = approvedUsers.find(au => au.id === user.id || au.email === user.email);
                      if (approvedUser && approvedUser.tempPassword) {
                        password = approvedUser.tempPassword;
                        console.log(`Found password for ${user.email} in approved_users: ${password}`);
                      }
                      
                      // Try to find password in waitlist
                      if (!password) {
                        // Check by email
                        const waitlistEntry = waitlistEntries.find(w => w.email === user.email);
                        if (waitlistEntry && (waitlistEntry.tempPassword || waitlistEntry.lastUsedPassword)) {
                          password = waitlistEntry.tempPassword || waitlistEntry.lastUsedPassword;
                          console.log(`Found password for ${user.email} in waitlist: ${password}`);
                        }
                        
                        // Check by reference
                        if (!password && user.waitlistId) {
                          const waitlistEntry = waitlistEntries.find(w => w.id === user.waitlistId);
                          if (waitlistEntry && (waitlistEntry.tempPassword || waitlistEntry.lastUsedPassword)) {
                            password = waitlistEntry.tempPassword || waitlistEntry.lastUsedPassword;
                            console.log(`Found password for ${user.email} in waitlist by ID: ${password}`);
                          }
                        }
                      }
                      
                      // Update user if password found
                      if (password) {
                        await updateDoc(doc(db, 'users', user.id), {
                          tempPassword: password,
                          updated_at: new Date().toISOString()
                        });
                        
                        // Also update in approved_users if exists
                        if (approvedUser) {
                          await updateDoc(doc(db, 'approved_users', user.id), {
                            tempPassword: password
                          });
                        }
                        
                        fixedUsers.push({
                          email: user.email,
                          password
                        });
                      }
                    }
                    
                    if (fixedUsers.length > 0) {
                      const passwordList = fixedUsers.map(u => `${u.email}: ${u.password}`).join('\n');
                      console.log("Fixed user passwords:", passwordList);
                      alert(`Fixed ${fixedUsers.length} user passwords!\n\n${passwordList}`);
                    } else {
                      alert("No user passwords needed fixing or none were found.");
                    }
                  } catch (error) {
                    console.error("Error fixing passwords:", error);
                    alert(`Error: ${error.message}`);
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Fix User Passwords
              </button>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              <button
                onClick={() => setTabAndInitializeUser('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setTabAndInitializeUser('waitlist')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'waitlist'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Waitlist
              </button>
              <button
                onClick={() => setTabAndInitializeUser('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setTabAndInitializeUser('permissions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Permissions
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Waitlist Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <UserPlus size={24} />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-medium text-gray-500">Waitlist</h2>
                    {statsError ? (
                      <div className="flex items-center mt-1">
                        <span className="text-red-500 text-sm">Error loading data</span>
                        <button 
                          onClick={retryFetchStats}
                          className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    ) : loading ? (
                      <div className="h-6 flex items-center">
                        <div className="animate-pulse h-4 w-12 bg-gray-200 rounded"></div>
                      </div>
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900">{waitlistCount}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="#"
                    onClick={(e) => { e.preventDefault(); setTabAndInitializeUser('waitlist'); }}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    View waitlist
                    <ChevronRight size={16} className="ml-1" />
                  </Link>
                </div>
              </div>

              {/* Today's Signups Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <Users size={24} />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-medium text-gray-500">Today's Signups</h2>
                    {statsError ? (
                      <div className="flex items-center mt-1">
                        <span className="text-red-500 text-sm">Error loading data</span>
                        <button 
                          onClick={retryFetchStats}
                          className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    ) : loading ? (
                      <div className="h-6 flex items-center">
                        <div className="animate-pulse h-4 w-12 bg-gray-200 rounded"></div>
                      </div>
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900">{todaySignups}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="#"
                    onClick={(e) => { e.preventDefault(); setTabAndInitializeUser('waitlist'); }}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    View details
                    <ChevronRight size={16} className="ml-1" />
                  </Link>
                </div>
              </div>

              {/* User Management Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <Shield size={24} />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-medium text-gray-500">User Management</h2>
                    <p className="text-2xl font-semibold text-gray-900">
                      {users.length}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="#"
                    onClick={(e) => { e.preventDefault(); setTabAndInitializeUser('users'); }}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    Manage users
                    <ChevronRight size={16} className="ml-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-500 text-center py-4">
                  Activity tracking will be implemented in a future update.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'waitlist' && (
          <WaitlistTable />
        )}

        {activeTab === 'users' && (
          <UserManagement />
        )}

        {activeTab === 'permissions' && (
          <div>
            {loadingUsers ? (
              <LoadingSpinner />
            ) : (
              <UserPermissionsManager 
                users={users} 
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
