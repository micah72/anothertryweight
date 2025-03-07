import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged
  } from 'firebase/auth';
  import { auth, db } from './config';
  import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
  
  const authService = {
    // Register a new user
    register: async (email, password) => {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
      } catch (error) {
        throw error;
      }
    },
  
    // Login existing user
    login: async (email, password) => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
      } catch (error) {
        throw error;
      }
    },
  
    // Logout user
    logout: async () => {
      try {
        await signOut(auth);
      } catch (error) {
        throw error;
      }
    },
  
    // Reset password
    resetPassword: async (email) => {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        throw error;
      }
    },
  
    // Subscribe to auth state changes
    onAuthStateChanged: (callback) => {
      return onAuthStateChanged(auth, callback);
    },
  
    // Create a new user
    createUser: async (email, password, userData = {}) => {
      try {
        console.log(`Creating account for ${email}`);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save additional user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email,
          created_at: new Date(),
          updated_at: new Date(),
          role: userData.role || 'regular',
          isApproved: userData.isApproved !== undefined ? userData.isApproved : true,
          tempPassword: password,
          ...userData
        });
        
        // Also add to approved_users collection if approved
        if (userData.isApproved) {
          await setDoc(doc(db, 'approved_users', user.uid), {
            email,
            approvedAt: new Date(),
            isApproved: true,
            tempPassword: password,
            ...userData
          });
        }
        
        return user;
      } catch (error) {
        console.error('Error creating user:', error);
        throw error;
      }
    },
  
    // Test if a password works for a specific email
    testCredentials: async (email, password) => {
      try {
        console.log(`Testing login for ${email} with password: ${password}`);
        // Save current user
        const currentUser = auth.currentUser;
        
        // Try to sign in with the provided credentials
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful!', userCredential.user.uid);
        
        // Sign out immediately after testing
        await signOut(auth);
        
        // If there was a previous user, sign back in
        if (currentUser) {
          // We'd need their password to sign back in, which we don't have
          // This will leave the user signed out - they'll need to sign in again
          console.log('Original user was logged out during credential testing');
        }
        
        return { success: true, uid: userCredential.user.uid };
      } catch (error) {
        console.error('Login test failed:', error);
        return { success: false, error };
      }
    },
  
    // Generate a secure password that works with Firebase Auth
    generateSecurePassword: () => {
      // Use only alphanumeric characters to avoid special character issues
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      
      // Add 8 random characters
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Ensure we have at least one uppercase, one lowercase, and one number
      password += 'A1a';
      
      return password;
    }
  };
  
  export default authService;