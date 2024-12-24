import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged
  } from 'firebase/auth';
  import { auth } from './config';
  
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
    }
  };
  
  export default authService;