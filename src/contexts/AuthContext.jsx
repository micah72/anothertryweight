import React, { createContext, useState, useContext, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import app, { db } from '../firebase/config'; // Import the Firebase app instance and db from config.js

// Get auth from the imported app
const auth = getAuth(app);

// Define admin ID as a constant to avoid reference errors
const ADMIN_ID = 'zFl7YxQw6CaP4ZJPthcvgGq2Rld2';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'admin', 'regular', etc.
  const [isApproved, setIsApproved] = useState(false);

  // Computed values for role checks - updated on each render
  // Always ensure these are boolean values
  const isAdmin = userRole === 'admin';
  const isRegularUser = userRole === 'regular';
  
  // Permission checker function
  const hasPermission = (permission) => {
    // Admin has all permissions
    if (userRole === 'admin') return true;
    
    // Define permission mappings for different roles
    const rolePermissions = {
      'admin': ['all', 'view_admin_dashboard', 'manage_users', 'manage_permissions', 'access_all_features'],
      'regular': ['basic_features', 'track_weight', 'view_recommendations']
      // You can add more roles with their permissions here
    };
    
    // Check if the user's role has the specific permission
    return rolePermissions[userRole]?.includes(permission) || false;
  };

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed", user ? `User: ${user.email}` : "No user");
      setUser(user);
      setLoading(false);

      if (user) {
        try {
          // If admin, set role and approved status directly
          if (user.uid === ADMIN_ID) {
            console.log('Current user is admin');
            setUserRole('admin');
            setIsApproved(true);
            return;
          }
          
          // For all other authenticated users, default to approved
          // This is the key change - we assume if they can authenticate, they should be allowed in
          console.log('Authenticated user, defaulting to approved');
          setUserRole('regular');
          setIsApproved(true);
          
          // Optionally try to get user data, but don't block login on it
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log(`User document found in 'users' collection:`, userData);
              
              // Set user role from document or default to regular
              setUserRole(userData.role || 'regular');
              
              // Only set to false if explicitly false in database
              if (userData.isApproved === false) {
                console.log('User explicitly not approved in users collection');
                setIsApproved(false);
              }
            }
          } catch (dbError) {
            console.error('Error reading user data, continuing with default values:', dbError);
            // Continue with defaults set above
          }
        } catch (error) {
          console.error('Error in auth state listener:', error);
          // Default to approved for authenticated users
          setUserRole('regular');
          setIsApproved(true);
          console.log('Defaulting user to approved due to error handling');
        }
      } else {
        setUserRole(null);
        setIsApproved(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      console.log(`Attempting login for: ${email}`);
      
      // Development mode bypass for easy testing - always available in any environment
      if (email === 'dev@example.com' && password === 'devmode') {
        console.log('DEV MODE: Bypassing authentication');
        
        // Create a mock user credential for development
        const mockUser = {
          uid: 'dev-user-id',
          email: 'dev@example.com',
          displayName: 'Development User'
        };
        
        // Set user state manually
        setUser(mockUser);
        setUserRole('admin'); // Give admin access for testing
        setIsApproved(true);
        
        return { user: mockUser };
      }
      
      // Normal authentication flow for production
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(`Firebase auth successful for: ${email}`);
      
      // Check if this is the admin user
      if (userCredential.user.uid === ADMIN_ID) {
        console.log(`User is admin, setting role and approval`);
        setUserRole('admin');
        setIsApproved(true);
        
        // Track login count for admin
        try {
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            // Increment login count and update last login timestamp
            const userData = userDoc.data();
            const loginCount = (userData.loginCount || 0) + 1;
            
            await updateDoc(userDocRef, {
              loginCount,
              lastLoginAt: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
            console.log(`Updated login count for admin: ${loginCount}`);
          } else {
            // Create user document if it doesn't exist
            await setDoc(userDocRef, {
              email: userCredential.user.email,
              role: 'admin',
              isApproved: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              loginCount: 1,
              lastLoginAt: new Date().toISOString()
            });
            console.log('Created user document for admin with login count');
          }
        } catch (error) {
          console.error('Error updating login count for admin:', error);
          // Non-critical error, continue login process
        }
        
        return userCredential;
      }
      
      // For all other users, default to approved status
      // The auth state listener will handle the detailed checks
      setUserRole('regular');
      setIsApproved(true);
      
      // Track login count for regular users
      try {
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Increment login count and update last login timestamp
          const userData = userDoc.data();
          const loginCount = (userData.loginCount || 0) + 1;
          
          await updateDoc(userDocRef, {
            loginCount,
            lastLoginAt: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          console.log(`Updated login count for user ${userCredential.user.email}: ${loginCount}`);
        } else {
          // Create user document if it doesn't exist (unlikely but possible)
          await setDoc(userDocRef, {
            email: userCredential.user.email,
            role: 'regular',
            isApproved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            loginCount: 1,
            lastLoginAt: new Date().toISOString()
          });
          console.log('Created user document with login count');
        }
      } catch (error) {
        console.error('Error updating login count:', error);
        // Non-critical error, continue login process
      }
      
      return userCredential;
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = async (email) => {
    if (!email) {
      throw new Error("Email is required");
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    isApproved,
    isAdmin,
    isRegularUser,
    hasPermission,
    login,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;