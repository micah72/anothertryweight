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
        
        // Check if user already exists first to avoid conflicts
        try {
          // First, check if there's an existing account with this email
          // This verification must be done outside the current auth session
          const testAuth = getAuth();
          await signInWithEmailAndPassword(testAuth, email, password);
          
          // If we get here, the account exists with this password
          console.log(`User already exists with this email and password`);
          await signOut(testAuth);
          
          // Return the existing user information
          return { uid: testAuth.currentUser.uid };
        } catch (existingUserError) {
          // Expected error - user doesn't exist or wrong password, proceed with creation
          console.log(`Creating new user: ${existingUserError.code}`);
        }
        
        // Create the Firebase Auth account
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
          passwordCreatedAt: new Date().toISOString(),
          ...userData
        });
        
        // Also add to approved_users collection if approved
        if (userData.isApproved) {
          await setDoc(doc(db, 'approved_users', user.uid), {
            email,
            approvedAt: new Date(),
            isApproved: true,
            tempPassword: password,
            passwordCreatedAt: new Date().toISOString(),
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
        // Log the exact email and password being tested for debugging
        console.log(`Testing login for email: "${email}" with password: "${password}"`);
        
        // This test needs to be performed very carefully to not disrupt the current session
        // We'll use a separate auth instance
        const testAuth = getAuth();
        
        try {
          // Try to sign in with the provided credentials
          const userCredential = await signInWithEmailAndPassword(testAuth, email, password);
          console.log('✅ Login test SUCCESSFUL!', userCredential.user.uid);
          
          // Sign out from the test auth instance
          await signOut(testAuth);
          
          return { success: true, uid: userCredential.user.uid };
        } catch (error) {
          console.error('❌ Login test FAILED:', error.code, error.message);
          
          // Important: Do not leave the auth in a bad state
          try {
            await signOut(testAuth);
          } catch (signOutError) {
            console.log('Error signing out after failed test:', signOutError);
          }
          
          return { success: false, error, code: error.code };
        }
      } catch (error) {
        console.error('Error setting up credential test:', error);
        return { success: false, error, code: error?.code };
      }
    },
  
    // Generate a secure password that works with Firebase Auth
    generateSecurePassword: () => {
      // Create separate character sets to ensure we use at least one of each type
      const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed similar-looking characters
      const lowercaseChars = 'abcdefghijkmnpqrstuvwxyz'; // Removed similar-looking characters
      const numberChars = '23456789'; // Removed 0 and 1 which look like O and l
      
      // Start with one character from each required set
      let password = '';
      
      // Add one uppercase letter
      password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
      
      // Add one lowercase letter
      password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
      
      // Add one number
      password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
      
      // Fill the rest of the password (7 more characters for a total of 10)
      const allChars = uppercaseChars + lowercaseChars + numberChars;
      for (let i = 0; i < 7; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }
      
      // Shuffle the password to make it more random
      password = password.split('').sort(() => 0.5 - Math.random()).join('');
      
      console.log('Generated secure password: ' + password);
      return password;
    }
  };
  
  export default authService;