import React, { createContext, useState, useContext, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import app, { db } from '../firebase/config'; // Import the Firebase app instance and db from config.js

// Get auth from the imported app
const auth = getAuth(app);

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user is the admin
        const adminId = 'zFl7YxQw6CaP4ZJPthcvgGq2Rld2';
        const isUserAdmin = user.uid === adminId;
        setIsAdmin(isUserAdmin);
        
        // If not admin, check if user is approved
        if (!isUserAdmin) {
          try {
            // Check the approved_users collection
            const userDocRef = doc(db, 'approved_users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setIsApproved(userData.isApproved === true);
            } else {
              setIsApproved(false);
            }
          } catch (error) {
            console.error('Error checking user approval status:', error);
            setIsApproved(false);
          }
        } else {
          // Admins are automatically approved
          setIsApproved(true);
        }
      } else {
        setIsAdmin(false);
        setIsApproved(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if admin or approved user
      const adminId = 'zFl7YxQw6CaP4ZJPthcvgGq2Rld2';
      if (userCredential.user.uid === adminId) {
        setIsAdmin(true);
        setIsApproved(true);
        return userCredential;
      }
      
      // Check if user is approved
      const userDocRef = doc(db, 'approved_users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isApproved === true) {
          setIsApproved(true);
          return userCredential;
        } else {
          // User exists in approved_users but isApproved is false
          await signOut(auth);
          throw new Error('Your account has not been approved yet.');
        }
      } else {
        // User is not in approved_users collection
        await signOut(auth);
        throw new Error('Your account has not been approved yet.');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    isAdmin,
    isApproved,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;