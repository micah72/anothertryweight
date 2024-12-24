import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDIauKKvL0eROqElQr1eBHk_Gt8fL8Avbo",
  authDomain: "healthtracker-85fc4.firebaseapp.com",
  projectId: "healthtracker-85fc4",
  storageBucket: "healthtracker-85fc4.firebasestorage.app",
  messagingSenderId: "878747113530",
  appId: "1:878747113530:web:936795384501288b97fd03",
  measurementId: "G-YE9XZKCEN6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Debug logging in development
if (import.meta.env.DEV) {
  console.log('Firebase initialization completed');
  console.log('Auth initialized:', !!auth);
  console.log('Firestore initialized:', !!db);
  console.log('Storage initialized:', !!storage);
}

export default app;