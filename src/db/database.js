class DatabaseService {
  constructor() {
    this.initDatabase();
    this.ensureDefaultUser();
  }

  initDatabase() {
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('foodEntries')) {
      localStorage.setItem('foodEntries', JSON.stringify([]));
    }
    if (!localStorage.getItem('goals')) {
      localStorage.setItem('goals', JSON.stringify([]));
    }
    if (!localStorage.getItem('mealPlans')) {
      localStorage.setItem('mealPlans', JSON.stringify([]));
    }
    if (!localStorage.getItem('healthStats')) {
      localStorage.setItem('healthStats', JSON.stringify([]));
    }
  }

  ensureDefaultUser() {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.length === 0) {
        this.createUser({
          id: 1,
          age: 30,
          height: 170,
          weight: 70,
          target_weight: 65,
          gender: 'male',
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error ensuring default user:', error);
    }
  }

  // User operations
  createUser(userData) {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const newUser = {
        id: userData.id || Date.now(),
        age: parseInt(userData.age) || 30,
        height: parseFloat(userData.height) || 170,
        weight: parseFloat(userData.weight) || 70,
        target_weight: parseFloat(userData.target_weight) || 65,
        gender: userData.gender || 'male',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  getUser(userId) {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      return users.find(user => user.id === userId) || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  updateUser(userId, userData) {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const index = users.findIndex(user => user.id === userId);
      
      if (index !== -1) {
        const updatedUser = {
          ...users[index],
          ...userData,
          age: parseInt(userData.age) || users[index].age,
          height: parseFloat(userData.height) || users[index].height,
          weight: parseFloat(userData.weight) || users[index].weight,
          target_weight: parseFloat(userData.target_weight) || users[index].target_weight,
          gender: userData.gender || users[index].gender,
          updated_at: new Date().toISOString()
        };
        users[index] = updatedUser;
        localStorage.setItem('users', JSON.stringify(users));
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Food entries operations
  addFoodEntry(entry) {
    try {
      const entries = JSON.parse(localStorage.getItem('foodEntries') || '[]');
      const newEntry = {
        id: Date.now(),
        ...entry,
        created_at: new Date().toISOString()
      };
      entries.push(newEntry);
      localStorage.setItem('foodEntries', JSON.stringify(entries));
      return newEntry;
    } catch (error) {
      console.error('Error adding food entry:', error);
      throw error;
    }
  }

  getFoodEntries(userId) {
    try {
      const entries = JSON.parse(localStorage.getItem('foodEntries') || '[]');
      return entries
        .filter(entry => entry.userId === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Error getting food entries:', error);
      return [];
    }
  }

  deleteFoodEntry(entryId) {
    try {
      const entries = JSON.parse(localStorage.getItem('foodEntries') || '[]');
      const newEntries = entries.filter(entry => entry.id !== entryId);
      localStorage.setItem('foodEntries', JSON.stringify(newEntries));
    } catch (error) {
      console.error('Error deleting food entry:', error);
      throw error;
    }
  }

  // Goals operations
  addGoal(goal) {
    try {
      const goals = JSON.parse(localStorage.getItem('goals') || '[]');
      const newGoal = {
        id: Date.now(),
        ...goal,
        created_at: new Date().toISOString()
      };
      goals.push(newGoal);
      localStorage.setItem('goals', JSON.stringify(goals));
      return newGoal;
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  }

  getGoals(userId) {
    try {
      const goals = JSON.parse(localStorage.getItem('goals') || '[]');
      return goals
        .filter(goal => goal.userId === userId)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } catch (error) {
      console.error('Error getting goals:', error);
      return [];
    }
  }

  updateGoal(goalId, goalData) {
    try {
      const goals = JSON.parse(localStorage.getItem('goals') || '[]');
      const index = goals.findIndex(goal => goal.id === goalId);
      
      if (index !== -1) {
        goals[index] = {
          ...goals[index],
          ...goalData,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('goals', JSON.stringify(goals));
        return goals[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  deleteGoal(goalId) {
    try {
      const goals = JSON.parse(localStorage.getItem('goals') || '[]');
      const newGoals = goals.filter(goal => goal.id !== goalId);
      localStorage.setItem('goals', JSON.stringify(newGoals));
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  // Meal plans operations
  addMealPlan(mealPlan) {
    try {
      const mealPlans = JSON.parse(localStorage.getItem('mealPlans') || '[]');
      const newMealPlan = {
        id: Date.now(),
        ...mealPlan,
        created_at: new Date().toISOString()
      };
      mealPlans.push(newMealPlan);
      localStorage.setItem('mealPlans', JSON.stringify(mealPlans));
      return newMealPlan;
    } catch (error) {
      console.error('Error adding meal plan:', error);
      throw error;
    }
  }

  getMealPlans(userId, date) {
    try {
      const mealPlans = JSON.parse(localStorage.getItem('mealPlans') || '[]');
      return mealPlans
        .filter(plan => 
          plan.userId === userId && 
          new Date(plan.date).toDateString() === new Date(date).toDateString()
        )
        .sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error getting meal plans:', error);
      return [];
    }
  }

  updateMealPlan(planId, planData) {
    try {
      const mealPlans = JSON.parse(localStorage.getItem('mealPlans') || '[]');
      const index = mealPlans.findIndex(plan => plan.id === planId);
      
      if (index !== -1) {
        mealPlans[index] = {
          ...mealPlans[index],
          ...planData,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('mealPlans', JSON.stringify(mealPlans));
        return mealPlans[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating meal plan:', error);
      throw error;
    }
  }

  deleteMealPlan(planId) {
    try {
      const mealPlans = JSON.parse(localStorage.getItem('mealPlans') || '[]');
      const newPlans = mealPlans.filter(plan => plan.id !== planId);
      localStorage.setItem('mealPlans', JSON.stringify(newPlans));
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      throw error;
    }
  }

  // Utility methods
  clearDatabase() {
    try {
      localStorage.clear();
      this.initDatabase();
      this.ensureDefaultUser();
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }

  getDatabaseStats() {
    try {
      return {
        users: JSON.parse(localStorage.getItem('users') || '[]').length,
        foodEntries: JSON.parse(localStorage.getItem('foodEntries') || '[]').length,
        goals: JSON.parse(localStorage.getItem('goals') || '[]').length,
        mealPlans: JSON.parse(localStorage.getItem('mealPlans') || '[]').length
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        users: 0,
        foodEntries: 0,
        goals: 0,
        mealPlans: 0
      };
    }
  }
}

const dbService = new DatabaseService();
export default dbService;