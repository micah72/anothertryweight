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
  limit,
  getDoc,
  setDoc
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
      await updateDoc(entryRef, data);
      return entryId;
    } catch (error) {
      console.error('Error updating food entry:', error);
      throw error;
    }
  },

  // Add calorie history record for archiving weekly calorie data
  addCalorieHistory: async (userId, data) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }

      const historyData = {
        ...data,
        userId,
        created_at: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'calorieHistory'), historyData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding calorie history:', error);
      throw error;
    }
  },

  // Get calorie history records
  getCalorieHistory: async (userId, limitCount = 10) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }

      const q = query(
        collection(db, 'calorieHistory'),
        where('userId', '==', userId),
        orderBy('weekStart', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });

      return history;
    } catch (error) {
      console.error('Error getting calorie history:', error);
      throw error;
    }
  },

  // subscribe to calorie history changes
  subscribeCalorieHistory: (userId, callback, errorCallback) => {
    try {
      if (!userId) {
        console.error('No user ID provided for calorie history subscription');
        if (typeof errorCallback === 'function') {
          errorCallback(new Error('No user ID provided'));
        }
        return () => {};
      }

      const q = query(
        collection(db, 'calorieHistory'),
        where('userId', '==', userId),
        orderBy('weekStart', 'desc')
      );

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          try {
            const history = [];
            snapshot.forEach((doc) => {
              history.push({ id: doc.id, ...doc.data() });
            });
            callback(history);
          } catch (error) {
            console.error('Error processing calorie history snapshot:', error);
            if (typeof errorCallback === 'function') {
              errorCallback(error);
            }
          }
        },
        (error) => {
          console.error('Error in calorie history subscription:', error);
          if (typeof errorCallback === 'function') {
            errorCallback(error);
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up calorie history subscription:', error);
      if (typeof errorCallback === 'function') {
        errorCallback(error);
      }
      return () => {};
    }
  },

  // User profile operations
  updateUserProfile: async (userId, data) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // User exists, update their profile
        await updateDoc(userDocRef, {
          ...data,
          updated_at: new Date().toISOString()
        });
      } else {
        // User doesn't exist, create their profile
        await setDoc(userDocRef, {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating profile for user ${userId}:`, error);
      throw error;
    }
  },

  getUserProfile: async (userId) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      // Directly access the user document by ID instead of querying
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return {
          id: userDoc.id,
          ...userDoc.data()
        };
      }
      
      // If nothing found, try fallback query
      const q = query(collection(db, 'users'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        };
      }
      
      console.log('No user profile found for ID:', userId);
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
      
      // Ensure all required fields are present and properly formatted
      const sanitizedData = {
        userId,
        type: goalData.type || 'weight',
        current_value: parseFloat(goalData.current_value) || 0,
        target_value: parseFloat(goalData.target_value) || 0,
        deadline: goalData.deadline || new Date().toISOString().split('T')[0],
        // Store reason data
        reason: goalData.reason || '',
        reasonDetail: goalData.reasonDetail || '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      
      console.log('Adding goal with data:', sanitizedData);
      
      const docRef = await addDoc(collection(db, 'goals'), sanitizedData);
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
      
      // Modified query to work without compound index
      const q = query(
        collection(db, 'goals'),
        where('userId', '==', userId)
        // Removed orderBy clause temporarily
      );
      
      const querySnapshot = await getDocs(q);
      // Sort the results in memory instead
      const goals = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure dates are properly formatted for display
          deadline: data.deadline || '',
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      });
      
      console.log('Raw goals data:', goals);
      
      // Sort in memory by created_at in descending order
      const sortedGoals = goals.sort((a, b) => {
        // Try to convert to date if it's a Firestore timestamp or string
        const dateA = a.created_at?.toDate?.() || new Date(a.created_at || 0);
        const dateB = b.created_at?.toDate?.() || new Date(b.created_at || 0);
        return dateB - dateA; // Descending order
      });
      
      console.log('Sorted goals data:', sortedGoals);
      return sortedGoals;
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
      
      // Modified query to work without compound index
      const q = query(
        collection(db, 'goals'),
        where('userId', '==', userId)
        // Removed orderBy clause temporarily
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          try {
            const goals = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              goals.push({
                id: doc.id,
                ...data,
                // Ensure dates are properly formatted for display
                deadline: data.deadline || '',
                created_at: data.created_at,
                updated_at: data.updated_at
              });
            });
            
            console.log('Raw subscription goals data:', goals);
            
            // Sort in memory by created_at in descending order
            goals.sort((a, b) => {
              // Try to convert to date if it's a Firestore timestamp or string
              const dateA = a.created_at?.toDate?.() || new Date(a.created_at || 0);
              const dateB = b.created_at?.toDate?.() || new Date(b.created_at || 0);
              return dateB - dateA; // Descending order
            });
            
            console.log('Sorted subscription goals data:', goals);
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

  // Weight entries operations
  addWeightEntry: async (userId, entryData) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      // Extract the date value
      let dateValue = entryData.date || new Date().toISOString().split('T')[0];
      
      // Fix for timezone issues: ensure the date is not shifted
      // For YYYY-MM-DD format, we need to append the time part to prevent timezone shifts
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Add T12:00:00 to set it to noon in the local timezone
        // This prevents date shifts across timezones
        const localDate = new Date(`${dateValue}T12:00:00`);
        dateValue = localDate.toISOString().split('T')[0];
      }
      
      // Ensure all required fields are present
      const weightEntry = {
        userId,
        goalId: entryData.goalId,
        date: dateValue,
        weight: parseFloat(entryData.weight) || 0,
        unit: entryData.unit || 'kg', // Store the unit used (kg or lb)
        notes: entryData.notes || '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'weightEntries'), weightEntry);
      return docRef.id;
    } catch (error) {
      console.error('Error adding weight entry:', error);
      throw error;
    }
  },

  // Get weight entries for a specific goal
  getWeightEntries: async (userId, goalId, limitCount = 100) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      let q;
      
      if (goalId) {
        // Query for entries for a specific goal - without compound sorting to avoid index requirement
        q = query(
          collection(db, 'weightEntries'),
          where('userId', '==', userId),
          where('goalId', '==', goalId)
          // Removed: orderBy('date', 'desc')
        );
      } else {
        // Query for all user's weight entries
        q = query(
          collection(db, 'weightEntries'),
          where('userId', '==', userId)
          // Removed: orderBy('date', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      // Instead of sorting in the query, sort in JavaScript
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort entries by date (newest first)
      return entries.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limitCount);
    } catch (error) {
      console.error('Error getting weight entries:', error);
      throw error;
    }
  },

  // Subscribe to weight entries changes for a specific goal
  subscribeWeightEntries: (userId, goalId, callback, errorCallback) => {
    try {
      if (!userId) {
        console.error('No user ID provided for weight entries subscription');
        if (typeof errorCallback === 'function') {
          errorCallback(new Error('No user ID provided'));
        }
        return () => {};
      }
      
      let q;
      
      if (goalId) {
        // Query for entries for a specific goal - without compound sorting to avoid index requirement
        q = query(
          collection(db, 'weightEntries'),
          where('userId', '==', userId),
          where('goalId', '==', goalId)
          // Removed: orderBy('date', 'desc')
        );
      } else {
        // Query for all user's weight entries
        q = query(
          collection(db, 'weightEntries'),
          where('userId', '==', userId)
          // Removed: orderBy('date', 'desc')
        );
      }

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          try {
            const entries = [];
            snapshot.forEach((doc) => {
              entries.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort entries by date in JavaScript instead of in the query
            entries.sort((a, b) => new Date(b.date) - new Date(a.date));
            callback(entries);
          } catch (error) {
            console.error('Error processing weight entries snapshot:', error);
            if (typeof errorCallback === 'function') {
              errorCallback(error);
            } else {
              callback([]);
            }
          }
        },
        (error) => {
          console.error('Error in weight entries subscription:', error);
          if (typeof errorCallback === 'function') {
            errorCallback(error);
          } else {
            callback([]);
          }
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up weight entries subscription:', error);
      if (typeof errorCallback === 'function') {
        errorCallback(error);
      } else {
        callback([]);
      }
      return () => {};
    }
  },
  
  // Delete a weight entry
  deleteWeightEntry: async (entryId) => {
    try {
      if (!entryId) {
        throw new Error('No entry ID provided');
      }
      
      await deleteDoc(doc(db, 'weightEntries', entryId));
      return true;
    } catch (error) {
      console.error('Error deleting weight entry:', error);
      throw error;
    }
  },

  // Update a weight entry
  updateWeightEntry: async (entryId, data) => {
    try {
      if (!entryId) {
        throw new Error('No entry ID provided');
      }

      const entryRef = doc(db, 'weightEntries', entryId);
      await updateDoc(entryRef, {
        ...data,
        updated_at: serverTimestamp()
      });
      return entryId;
    } catch (error) {
      console.error('Error updating weight entry:', error);
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

      // Try the optimized query first with composite index
      try {
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
      } catch (indexError) {
        // If we get a failed-precondition error, it means the composite index doesn't exist
        if (indexError.code === 'failed-precondition') {
          console.warn('Composite index not found, falling back to simpler query');
          
          // Fallback to a simpler query that doesn't require the composite index
          const simpleQuery = query(
            collection(db, 'mealPlans'),
            where('userId', '==', userId)
          );
          
          const querySnapshot = await getDocs(simpleQuery);
          
          // Filter the results in memory
          const filteredDocs = querySnapshot.docs.filter(doc => {
            try {
              const docData = doc.data();
              if (!docData.date) return false;
              
              // Handle different date formats
              let mealDate;
              if (docData.date instanceof Date) {
                mealDate = docData.date;
              } else if (docData.date.toDate && typeof docData.date.toDate === 'function') {
                mealDate = docData.date.toDate();
              } else if (typeof docData.date === 'string') {
                mealDate = new Date(docData.date);
              } else {
                return false; // Skip invalid dates
              }
              
              return mealDate >= startOfDay && mealDate <= endOfDay;
            } catch (err) {
              console.warn('Error filtering meal date:', err);
              return false;
            }
          });
          
          // Sort the results in memory
          filteredDocs.sort((a, b) => {
            try {
              const aData = a.data();
              const bData = b.data();
              
              // Handle different date formats
              let dateA, dateB;
              
              if (aData.date instanceof Date) {
                dateA = aData.date;
              } else if (aData.date.toDate && typeof aData.date.toDate === 'function') {
                dateA = aData.date.toDate();
              } else if (typeof aData.date === 'string') {
                dateA = new Date(aData.date);
              } else {
                dateA = new Date(0); // Default for invalid dates
              }
              
              if (bData.date instanceof Date) {
                dateB = bData.date;
              } else if (bData.date.toDate && typeof bData.date.toDate === 'function') {
                dateB = bData.date.toDate();
              } else if (typeof bData.date === 'string') {
                dateB = new Date(bData.date);
              } else {
                dateB = new Date(0); // Default for invalid dates
              }
              
              return dateA - dateB;
            } catch (err) {
              console.warn('Error sorting meal dates:', err);
              return 0;
            }
          });
          
          return filteredDocs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } else {
          // If it's a different error, rethrow it
          throw indexError;
        }
      }
    } catch (error) {
      console.error('Error getting meal plans:', error);
      // Return empty array instead of throwing to prevent cascading errors
      return [];
    }
  },
  
  // Helper method to safely convert Firestore dates to JavaScript Date objects
  convertFirestoreDate: (firestoreDate) => {
    if (!firestoreDate) return null;
    
    try {
      if (firestoreDate instanceof Date) {
        return firestoreDate;
      } else if (firestoreDate.toDate && typeof firestoreDate.toDate === 'function') {
        return firestoreDate.toDate();
      } else if (typeof firestoreDate === 'string') {
        return new Date(firestoreDate);
      }
    } catch (error) {
      console.error('Error converting Firestore date:', error);
    }
    
    return null;
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
  },
  // AI meal suggestions operations
  saveAiMealSuggestions: async (userId, suggestions) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      // Create a document reference with a specific ID based on the user
      const suggestionsRef = doc(db, 'aiMealSuggestions', userId);
      
      // Set the document with the suggestions data
      await setDoc(suggestionsRef, {
        userId,
        suggestions,
        updated_at: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error saving AI meal suggestions:', error);
      throw error;
    }
  },
  
  getAiMealSuggestions: async (userId) => {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      const suggestionsRef = doc(db, 'aiMealSuggestions', userId);
      const docSnap = await getDoc(suggestionsRef);
      
      if (docSnap.exists()) {
        return docSnap.data().suggestions;
      } else {
        return {};
      }
    } catch (error) {
      console.error('Error getting AI meal suggestions:', error);
      throw error;
    }
  }
};

export default dbService;