import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './config';

const dbService = {
  // Real-time listener for food entries
  subscribeFoodEntries: (userId, type = 'food', callback, errorCallback) => {
    try {
      if (!userId) {
        console.error('No user ID provided for subscription');
        if (typeof errorCallback === 'function') {
          errorCallback(new Error('No user ID provided'));
        }
        return () => {};
      }
      
      console.log('Setting up subscription for user:', userId);
      
      const q = query(
        collection(db, 'foodEntries'),
        where('userId', '==', userId),
        where('type', '==', type),
        orderBy('created_at', 'desc')
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          try {
            const entries = [];
            snapshot.forEach((doc) => {
              entries.push({ id: doc.id, ...doc.data() });
            });
            console.log('Received food entries:', entries);
            callback(entries);
          } catch (error) {
            console.error('Error processing snapshot data:', error);
            if (typeof errorCallback === 'function') {
              errorCallback(error);
            } else {
              callback([]);
            }
          }
        },
        (error) => {
          console.error('Error in food entries subscription:', error);
          if (error.code === 'failed-precondition') {
            console.log('Index required:', error.message);
          }
          
          // If an error callback was provided, use it
          if (typeof errorCallback === 'function') {
            errorCallback(error);
          } else {
            // Otherwise fallback to the main callback with empty array
            callback([]);
          }
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up subscription:', error);
      
      // If an error callback was provided, use it
      if (typeof errorCallback === 'function') {
        errorCallback(error);
      } else {
        // Otherwise fallback to the main callback with empty array
        callback([]);
      }
      
      return () => {};
    }
  },

  // Add food entry
  addFoodEntry: async (userId, data) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      // Ensure all required fields are present
      const entryData = {
        userId,
        imagePath: data.imagePath || '',
        foodName: data.foodName || 'Unnamed Food',
        calories: Number(data.calories) || 0,
        healthScore: Number(data.healthScore) || 0,
        type: data.type || 'food',
        items: Array.isArray(data.items) ? data.items : [],
        expiringItems: Array.isArray(data.expiringItems) ? data.expiringItems : [],
        suggestedRecipes: Array.isArray(data.suggestedRecipes) ? data.suggestedRecipes : [],
        analysisData: data.analysisData || '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'foodEntries'), entryData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding food entry:', error);
      throw error;
    }
  },

  // Get food entries
  getFoodEntries: async (userId, type = 'food', limitCount = 50) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      const q = query(
        collection(db, 'foodEntries'),
        where('userId', '==', userId),
        where('type', '==', type),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting food entries:', error);
      throw error;
    }
  },

  // Delete food entry
  deleteFoodEntry: async (entryId) => {
    try {
      if (!entryId) {
        throw new Error('No entry ID provided');
      }
      
      await deleteDoc(doc(db, 'foodEntries', entryId));
      return true;
    } catch (error) {
      console.error('Error deleting food entry:', error);
      throw error;
    }
  },

  // Update food entry
  updateFoodEntry: async (entryId, data) => {
    try {
      if (!entryId) {
        throw new Error('No entry ID provided');
      }
      
      const entryRef = doc(db, 'foodEntries', entryId);
      await updateDoc(entryRef, {
        ...data,
        updated_at: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating food entry:', error);
      throw error;
    }
  },

  // User profile operations
  updateUserProfile: async (userId, data) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      const userQuery = query(collection(db, 'users'), where('userId', '==', userId));
      const querySnapshot = await getDocs(userQuery);

      const userData = {
        ...data,
        updated_at: serverTimestamp()
      };

      if (querySnapshot.empty) {
        // Create new user profile
        await addDoc(collection(db, 'users'), {
          userId,
          ...userData,
          created_at: serverTimestamp()
        });
      } else {
        // Update existing profile
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), userData);
      }
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  getUserProfile: async (userId) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      const q = query(collection(db, 'users'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  // Goals operations
  addGoal: async (userId, goalData) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      const docRef = await addDoc(collection(db, 'goals'), {
        userId,
        ...goalData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  },

  getGoals: async (userId) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      const q = query(
        collection(db, 'goals'),
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting goals:', error);
      throw error;
    }
  },

  subscribeGoals: (userId, callback, errorCallback) => {
    try {
      if (!userId) {
        console.error('No user ID provided for goals subscription');
        if (typeof errorCallback === 'function') {
          errorCallback(new Error('No user ID provided'));
        } else {
          callback([]);
        }
        return () => {};
      }
      
      const q = query(
        collection(db, 'goals'),
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          try {
            const goals = [];
            snapshot.forEach((doc) => {
              goals.push({ id: doc.id, ...doc.data() });
            });
            callback(goals);
          } catch (error) {
            console.error('Error processing goals snapshot data:', error);
            if (typeof errorCallback === 'function') {
              errorCallback(error);
            } else {
              callback([]);
            }
          }
        },
        (error) => {
          console.error('Error in goals subscription:', error);
          if (typeof errorCallback === 'function') {
            errorCallback(error);
          } else {
            callback([]);
          }
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up goals subscription:', error);
      if (typeof errorCallback === 'function') {
        errorCallback(error);
      } else {
        callback([]);
      }
      return () => {};
    }
  },

  updateGoal: async (goalId, data) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      await updateDoc(goalRef, {
        ...data,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  },

  deleteGoal: async (goalId) => {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  },

  // Meal plans operations
  addMealPlan: async (userId, planData) => {
    try {
      const docRef = await addDoc(collection(db, 'mealPlans'), {
        userId,
        ...planData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding meal plan:', error);
      throw error;
    }
  },

  getMealPlans: async (userId, date) => {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'mealPlans'),
        where('userId', '==', userId),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting meal plans:', error);
      throw error;
    }
  },

  updateMealPlan: async (planId, data) => {
    try {
      const planRef = doc(db, 'mealPlans', planId);
      await updateDoc(planRef, {
        ...data,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating meal plan:', error);
      throw error;
    }
  },

  deleteMealPlan: async (planId) => {
    try {
      await deleteDoc(doc(db, 'mealPlans', planId));
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      throw error;
    }
  }
};

export default dbService;