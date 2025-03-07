import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle, Save, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { doc, updateDoc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import LoadingSpinner from './LoadingSpinner';

// Collapsible component for a single user's permissions
const CollapsibleUserPermissions = ({ user, allPermissions, onSave }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadUserPermissions();
    }
  }, [user]);

  const loadUserPermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If user is an admin, automatically grant all permissions
        if (userData.role === 'admin') {
          // Create an object with all permissions set to true
          const adminPermissions = {};
          Object.keys(allPermissions).forEach(key => {
            adminPermissions[key] = true;
          });
          
          // Update the permissions in Firestore
          await updateDoc(userDocRef, {
            permissions: adminPermissions,
            updated_at: new Date().toISOString()
          });
          
          setUserPermissions(adminPermissions);
        } else {
          setUserPermissions(userData.permissions || {});
        }
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setMessage('Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permKey) => {
    setUserPermissions(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const savePermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, {
        permissions: userPermissions,
        updated_at: new Date().toISOString()
      });
      
      setMessage('Permissions updated successfully');
      setTimeout(() => setMessage(''), 3000);
      
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving permissions:', error);
      setMessage('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 border rounded-lg overflow-hidden shadow-sm">
      <div 
        className={`px-4 py-3 flex justify-between items-center cursor-pointer ${isExpanded ? 'bg-gray-100' : 'bg-white'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Users className="h-5 w-5 text-gray-500" />
          <div>
            <div className="font-medium">{user.email}</div>
            <div className="text-sm text-gray-500">Role: {user.role || 'regular'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {message && (
            <span className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </span>
          )}
          {loading ? <LoadingSpinner /> : isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t">
          {user.role === 'admin' && (
            <div className="bg-green-50 p-4 text-green-800 border-b border-green-100">
              <p className="font-medium">Admin User</p>
              <p className="text-sm">Admin users automatically have all permissions granted.</p>
            </div>
          )}
          <dl>
            {Object.entries(allPermissions).map(([permKey, permData], index) => {
              // For admin users, always show permissions as granted
              const hasAccess = user.role === 'admin' ? true : userPermissions[permKey];
              
              return (
                <div 
                  key={permKey}
                  className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}
                >
                  <dt className="text-sm font-medium text-gray-500">
                    {permData.label}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {hasAccess ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                            <span>Permitted</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-500 mr-2" />
                            <span>Not permitted</span>
                          </>
                        )}
                        <span className="ml-4 text-xs text-gray-500">{permData.description}</span>
                      </div>
                      
                      {/* Only show toggle button for non-admin users */}
                      {user.role !== 'admin' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent panel collapse when clicking the button
                            togglePermission(permKey);
                          }}
                          className={`px-3 py-1 rounded text-white ${hasAccess ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                        >
                          {hasAccess ? 'Revoke' : 'Grant'}
                        </button>
                      )}
                    </div>
                  </dd>
                </div>
              );
            })}
          </dl>
          
          {/* Only show save button for non-admin users */}
          {user.role !== 'admin' && (
            <div className="px-4 py-3 bg-gray-50 text-right">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent panel collapse when clicking the button
                  savePermissions();
                }}
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                {loading ? <LoadingSpinner /> : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Permissions
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main UserPermissionsManager component
const UserPermissionsManager = ({ selectedUser }) => {
  const { hasPermission, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [displayedUsers, setDisplayedUsers] = useState([]);

  // Define all available permissions
  const allPermissions = {
    'basic_features': {
      label: 'Basic Features',
      description: 'Access to core application functionality'
    },
    'track_weight': {
      label: 'Track Weight',
      description: 'Record and monitor weight changes'
    },
    'view_recommendations': {
      label: 'View Recommendations',
      description: 'See personalized food recommendations'
    },
    'view_admin_dashboard': {
      label: 'Admin Dashboard',
      description: 'Access to the admin dashboard'
    },
    'manage_users': {
      label: 'Manage Users',
      description: 'Create, edit, and delete user accounts'
    },
    'manage_permissions': {
      label: 'Manage Permissions',
      description: 'Change permission settings for users'
    },
    'access_all_features': {
      label: 'All Features',
      description: 'Unrestricted access to all app features'
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    // When selectedUser changes, update displayed users
    if (selectedUser) {
      const isUserAlreadyDisplayed = displayedUsers.some(u => u.id === selectedUser.id);
      if (!isUserAlreadyDisplayed) {
        setDisplayedUsers(prev => [...prev, selectedUser]);
      }
    }
  }, [selectedUser]);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollectionRef);
      
      const fetchedUsers = [];
      querySnapshot.forEach(doc => {
        fetchedUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Also check approved_users collection for backward compatibility
      const approvedUsersRef = collection(db, 'approved_users');
      const approvedSnapshot = await getDocs(approvedUsersRef);
      
      approvedSnapshot.forEach(doc => {
        // Only add if not already in users collection
        if (!fetchedUsers.some(u => u.id === doc.id)) {
          fetchedUsers.push({
            id: doc.id,
            email: doc.data().email,
            isApproved: doc.data().isApproved === true,
            role: 'regular',
            created_at: doc.data().approvedAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
      
      // Check for the hardcoded admin user
      const adminId = 'zFl7YxQw6CaP4ZJPthcvgGq2Rld2';
      let adminExists = false;
      
      for (const user of fetchedUsers) {
        if (user.id === adminId) {
          adminExists = true;
          // Ensure the role is set to admin
          if (user.role !== 'admin') {
            user.role = 'admin';
            user.isApproved = true;
          }
          break;
        }
      }
      
      // If admin user doesn't exist in our lists, add it manually
      if (!adminExists) {
        // Try to get the admin user's email from auth context if available
        const adminEmail = user && user.uid === adminId ? user.email : 'admin@example.com';
        
        fetchedUsers.push({
          id: adminId,
          email: adminEmail,
          role: 'admin',
          isApproved: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Also add to users collection
        try {
          const userRef = doc(db, 'users', adminId);
          await setDoc(userRef, {
            email: adminEmail,
            role: 'admin',
            isApproved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error('Error adding admin user to users collection:', err);
        }
      }
      
      setAllUsers(fetchedUsers);
      
      // If no users are displayed yet, show the admin user
      if (displayedUsers.length === 0) {
        const adminUser = fetchedUsers.find(u => u.role === 'admin');
        if (adminUser) {
          setDisplayedUsers([adminUser]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const addUserToDisplay = (userId) => {
    const userToAdd = allUsers.find(u => u.id === userId);
    if (userToAdd && !displayedUsers.some(u => u.id === userId)) {
      setDisplayedUsers(prev => [...prev, userToAdd]);
    }
  };

  const removeUserFromDisplay = (userId) => {
    setDisplayedUsers(prev => prev.filter(u => u.id !== userId));
  };

  if (loading && allUsers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
          Add a user to manage permissions
        </label>
        <div className="flex space-x-2">
          <select
            id="user-select"
            className="flex-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="">-- Select a user --</option>
            {allUsers.filter(u => !displayedUsers.some(du => du.id === u.id)).map(user => (
              <option key={user.id} value={user.id}>
                {user.email} ({user.role || 'regular'})
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const select = document.getElementById('user-select');
              if (select.value) {
                addUserToDisplay(select.value);
                select.value = '';
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
          >
            Add User
          </button>
        </div>
      </div>
      
      {displayedUsers.length === 0 ? (
        <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
          <p>No users selected. Please add a user to manage permissions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedUsers.map(user => (
            <CollapsibleUserPermissions 
              key={user.id} 
              user={user} 
              allPermissions={allPermissions}
              onSave={fetchAllUsers}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserPermissionsManager; 