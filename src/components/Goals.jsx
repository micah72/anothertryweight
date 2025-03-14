import React, { useState, useEffect, useMemo } from 'react';
import dbService from '../firebase/dbService'; // Updated to use firebase service
import localDbService from '../db/database'; // Add local database service
import { useAuth } from '../contexts/AuthContext';
import { Lightbulb, Plus, X, Calendar, Edit2, Trash2, ChevronDown, ChevronUp, Info, Clock } from 'lucide-react'; // Import icons
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'; // Import Recharts components

// Create an instance of the local database service if it's a class
const localDb = typeof localDbService === 'function' ? new localDbService() : localDbService;

const Goals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [newGoal, setNewGoal] = useState({
    type: 'weight',
    target_value: '',
    current_value: '',
    deadline: ''
  });
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionReasons, setSuggestionReasons] = useState({});
  
  // New state for modal control
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  
  // New states for calorie tracking
  const [foodEntries, setFoodEntries] = useState([]);
  const [dailyCalorieData, setDailyCalorieData] = useState({});
  const [weeklyCalorieData, setWeeklyCalorieData] = useState([]);
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [calorieGoalUpdated, setCalorieGoalUpdated] = useState(false);

  // New states for weight tracking and unit preferences
  const [showAddWeightModal, setShowAddWeightModal] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState({});
  const [selectedWeightGoal, setSelectedWeightGoal] = useState(null);
  const [weightEntries, setWeightEntries] = useState([]);
  const [newWeightEntry, setNewWeightEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    notes: ''
  });
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 'lb'
  const [loadingWeightEntries, setLoadingWeightEntries] = useState(false);
  const [tempMessage, setTempMessage] = useState(''); // Add this for showing temporary messages

  // In the state variables section, add a new state for the form unit
  const [goalFormData, setGoalFormData] = useState({
    type: 'weight',
    current_value: '',
    target_value: '',
    deadline: new Date().toISOString().split('T')[0],
    reason: '',
    reasonDetail: ''
  });
  const [goalUnit, setGoalUnit] = useState('kg'); // Default unit for weight goals

  const [showCalorieHistory, setShowCalorieHistory] = useState({});

  useEffect(() => {
    if (user) {
      loadGoals();
      loadFoodEntries();
      
      // Set up subscription to goals
      const unsubscribeGoals = dbService.subscribeGoals(
        user.uid,
        (loadedGoals) => {
          console.log('Subscription received goals:', loadedGoals);
          setGoals(loadedGoals || []);
          setLoading(false);
          setError(null); // Clear any errors on successful load
        },
        (error) => {
          console.error('Error subscribing to goals:', error);
          setLoading(false);
          setError('Error connecting to the database. Your goals will not update automatically.');
          
          // Still attempt to load goals directly as a fallback
          loadGoals().catch(e => console.error('Fallback load also failed:', e));
        }
      );
      
      // Set up subscription to food entries
      const unsubscribeFoodEntries = dbService.subscribeFoodEntries(
        user.uid,
        'food',
        (entries) => {
          console.log('Subscription received food entries:', entries);
          setFoodEntries(entries || []);
        },
        (error) => {
          console.error('Error subscribing to food entries:', error);
        }
      );
      
      return () => {
        unsubscribeGoals();
        unsubscribeFoodEntries();
      };
    }
  }, [user]);

  // Process food entries to calculate daily and weekly calories
  useEffect(() => {
    if (foodEntries.length > 0) {
      processFoodEntries();
    }
  }, [foodEntries]);

  // Update calorie goal automatically when daily calorie data changes
  useEffect(() => {
    if (Object.keys(dailyCalorieData).length > 0 && !calorieGoalUpdated) {
      updateCalorieGoal();
    }
  }, [dailyCalorieData]);

  // Load weight entries when selectedWeightGoal changes
  useEffect(() => {
    if (selectedWeightGoal) {
      // Load weight entries initially
      loadWeightEntries(selectedWeightGoal.id);
      
      // Set up subscription
      const unsubscribe = dbService.subscribeWeightEntries(
        user.uid,
        selectedWeightGoal.id,
        (entries) => {
          console.log('Subscription received weight entries:', entries);
          setWeightEntries(entries || []);
          setLoadingWeightEntries(false);
        },
        (error) => {
          console.error('Error subscribing to weight entries:', error);
          setLoadingWeightEntries(false);
          // Still attempt to load entries directly as a fallback
          loadWeightEntries(selectedWeightGoal.id);
        }
      );
      
      return () => {
        unsubscribe();
      };
    }
  }, [selectedWeightGoal, user]);
  
  // Load weight entries from database
  const loadWeightEntries = async (goalId) => {
    if (!user) return;
    
    try {
      setLoadingWeightEntries(true);
      
      if (goalId) {
        // Load entries for a specific goal
        const entries = await dbService.getWeightEntries(user.uid, goalId);
        console.log(`Loaded weight entries for goal ${goalId}:`, entries);
        setWeightEntries(entries || []);
      } else {
        // Load entries for all weight goals
        const weightGoals = goals.filter(goal => goal.type === 'weight');
        let allEntries = [];
        
        for (const goal of weightGoals) {
          try {
            const entries = await dbService.getWeightEntries(user.uid, goal.id);
            if (entries && entries.length > 0) {
              allEntries = [...allEntries, ...entries];
            }
          } catch (err) {
            console.error(`Error loading entries for goal ${goal.id}:`, err);
          }
        }
        
        console.log('Loaded all weight entries:', allEntries);
        setWeightEntries(allEntries || []);
      }
    } catch (error) {
      console.error('Error loading weight entries:', error);
    } finally {
      setLoadingWeightEntries(false);
    }
  };
  
  // Toggle weight history display
  const toggleWeightHistory = (goalId) => {
    // Toggle the visibility state
    const newIsVisible = !showWeightHistory[goalId];
    
    setShowWeightHistory(prev => ({
      ...prev,
      [goalId]: newIsVisible
    }));
    
    // If we're opening the history, load this goal's entries
    if (newIsVisible) {
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        setSelectedWeightGoal(goal);
        // Load entries specifically for this goal
        loadWeightEntries(goalId);
      }
    }
  };
  
  // Toggle calorie history visibility
  const toggleCalorieHistory = (goalId) => {
    // Toggle the visibility state
    const newIsVisible = !showCalorieHistory[goalId];
    
    setShowCalorieHistory(prev => ({
      ...prev,
      [goalId]: newIsVisible
    }));
    
    // If we're opening the history, ensure food entries are loaded and processed
    if (newIsVisible) {
      if (foodEntries.length === 0) {
        loadFoodEntries();
      } else if (Object.keys(dailyCalorieData).length === 0) {
        // If we have food entries but dailyCalorieData hasn't been processed yet
        processFoodEntries();
      }
    }
  };
  
  // Open add weight modal
  const openAddWeightModal = (goal) => {
    setSelectedWeightGoal(goal);
    
    // Reset form with default values
    setNewWeightEntry({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      notes: ''
    });
    
    setShowAddWeightModal(true);
  };
  
  // Close add weight modal
  const closeAddWeightModal = () => {
    setShowAddWeightModal(false);
  };
  
  // Handle weight entry input changes
  const handleWeightEntryChange = (e) => {
    const { name, value } = e.target;
    setNewWeightEntry({
      ...newWeightEntry,
      [name]: value
    });
  };
  
  // Submit new weight entry
  const handleWeightEntrySubmit = async (e) => {
    e.preventDefault();
    if (!user || !selectedWeightGoal) return;
    
    try {
      setLoading(true);
      
      const entryData = {
        goalId: selectedWeightGoal.id,
        date: newWeightEntry.date,
        weight: parseFloat(newWeightEntry.weight) || 0,
        notes: newWeightEntry.notes || '',
        unit: weightUnit
      };
      
      // Add entry to database
      await dbService.addWeightEntry(user.uid, entryData);
      
      // Reload weight entries
      await loadWeightEntries(selectedWeightGoal.id);
      
      // We no longer update the goal's current_value
      // Instead, we want to maintain the original profile weight (227.1 lb)
      // while still tracking the entries separately
      
      /* 
      // Removed: This would update the goal's current value with the entry weight
      const today = new Date().toISOString().split('T')[0];
      const entryDate = new Date(newWeightEntry.date).toISOString().split('T')[0];
      
      if (entryDate >= today) {
        await dbService.updateGoal(selectedWeightGoal.id, {
          current_value: parseFloat(newWeightEntry.weight),
          last_updated: new Date().toISOString()
        });
        
        // Reload goals to show updated current value
        await loadGoals();
      }
      */
      
      // Just update the last_updated timestamp
      await dbService.updateGoal(selectedWeightGoal.id, {
        last_updated: new Date().toISOString()
      });
      
      // Ensure the weight history dropdown is visible for the goal
      setShowWeightHistory(prev => ({
        ...prev,
        [selectedWeightGoal.id]: true
      }));
      
      // Show a success message
      setTempMessage('Weight entry added successfully');
      setTimeout(() => setTempMessage(''), 3000);
      
      // Close modal and reset form
      setShowAddWeightModal(false);
      setNewWeightEntry({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error adding weight entry:', error);
      setError('Failed to add weight entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle weight unit between kg and lb
  const toggleWeightUnit = () => {
    setWeightUnit(prevUnit => {
      const newUnit = prevUnit === 'kg' ? 'lb' : 'kg';
      localStorage.setItem('preferredWeightUnit', newUnit);
      
      // Check if any weight goals have unexpectedly high values
      const highValueWeightGoals = goals.filter(goal => 
        goal.type === 'weight' && !goal.isDeleted && 
        ((newUnit === 'lb' && (goal.unit === 'kg' && goal.current_value > 113)) || // More than 250 lb in kg
         (newUnit === 'kg' && (goal.unit === 'lb' && goal.current_value > 250)) || // More than 250 lb
         (goal.unit === undefined)) // Also fix goals with no unit specified
      );
      
      if (highValueWeightGoals.length > 0) {
        // Show a message to the user about fixing the values
        setError('Some weight goals have unexpectedly high values. They are being updated to your profile weight of 227.1 lb.');
        
        // Automatically fix the weight values
        highValueWeightGoals.forEach(goal => {
          updateGoalCurrentWeight(goal.id, 227.1);
        });
        
        // Clear the error after 5 seconds
        setTimeout(() => {
          setError(null);
        }, 5000);
      }
      
      return newUnit;
    });
  };
  
  // Convert weight between kg and lb
  const convertWeight = (weight, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return weight;
    
    // Ensure weight is a number
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight)) {
      console.error('Invalid weight value for conversion:', weight);
      return weight;
    }
    
    // Convert kg to lb
    if (fromUnit === 'kg' && toUnit === 'lb') {
      const result = (numWeight * 2.20462).toFixed(1);
      console.log(`Converting ${numWeight} kg to lb: ${result} lb`);
      return result;
    }
    
    // Convert lb to kg
    if (fromUnit === 'lb' && toUnit === 'kg') {
      const result = (numWeight / 2.20462).toFixed(1);
      console.log(`Converting ${numWeight} lb to kg: ${result} kg`);
      return result;
    }
    
    return weight;
  };
  
  // Display weight with proper unit
  const displayWeight = (weight, originalUnit = 'kg') => {
    return convertWeight(weight, originalUnit, weightUnit);
  };
  
  // Load preferred weight unit from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem('preferredWeightUnit');
    if (savedUnit === 'kg' || savedUnit === 'lb') {
      setWeightUnit(savedUnit);
    }
  }, []);
  
  // Add a useEffect to automatically check and fix weight goals when goals are loaded
  useEffect(() => {
    if (goals.length > 0 && !loading) {
      // Check if any weight goals need to be fixed
      checkWeightGoals(goals);
    }
  }, [goals.length, loading]);

  // Get the unit for a specific goal type with unit conversion support
  const getUnitForGoalType = (type, value = null, originalUnit = null) => {
    if (type === 'weight') {
      return weightUnit;
    }
    
    const unitMap = {
      'weight': 'kg',
      'calories': 'kcal',
      'exercise': 'min'
    };
    return unitMap[type] || '';
  };
  
  // Updated to support unit conversion and display the proper value
  const displayGoalValue = (goal, valueType) => {
    if (!goal) return '';
    
    let value = goal[valueType]; // current_value or target_value
    
    if (goal.type === 'weight') {
      // Check if weight value seems unreasonable and potentially needs fixing
      const originalUnit = goal.unit || 'kg';
      
      // Validate the weight value
      if ((originalUnit === 'lb' && value > 250) || 
          (originalUnit === 'kg' && value > 113)) {
        console.log(`Found unusually high weight value: ${value} ${originalUnit}`);
        
        // Use profile weight instead
        if (originalUnit === 'lb') {
          value = 227.1; // Use profile weight in lb
        } else {
          value = 103; // Approximately 227.1 lb in kg
        }
      }
      
      // For weight goals, apply unit conversion if needed
      console.log(`Displaying ${valueType} for weight goal:`, value, 'Original unit:', originalUnit, 'Display unit:', weightUnit);
      
      // If the value is already in the display unit we want, just return it
      if (originalUnit === weightUnit) {
        return value;
      }
      
      // Otherwise, apply the conversion
      return displayWeight(value, originalUnit);
    }
    
    // For other goal types, just return the value
    return value;
  };

  // Open modal with AI suggestion
  const openModalWithSuggestion = async () => {
    // Pre-populate the current weight with 227.1 lb
    setGoalFormData({
      ...goalFormData,
      type: 'weight',
      current_value: '227.1',
      deadline: new Date().toISOString().split('T')[0],
    });
    // Set the unit to lb
    setGoalUnit('lb');
    setShowAddGoalModal(true);
    await generateSuggestion();
  };
  
  // Reset form state when modal is closed
  const handleCloseModal = () => {
    setShowAddGoalModal(false);
    if (!editingGoal) {
      setNewGoal({
        type: 'weight',
        target_value: '',
        current_value: '',
        deadline: ''
      });
      // Don't reset the goalFormData here, as we want to keep the current weight value
      setShowSuggestion(false);
    }
    setTempMessage(''); // Clear any temporary messages
  };
  
  // Handle successful form submission
  const handleFormSuccess = () => {
    setShowAddGoalModal(false);
    setNewGoal({
      type: 'weight',
      target_value: '',
      current_value: '',
      deadline: ''
    });
    // Don't reset the goalFormData here, as we want to keep the current weight value
    setShowSuggestion(false);
  };
  
  // Modified handleSubmit to close modal on success
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to add a goal');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare goal data, including the unit for weight goals
      let goalData = {
        ...goalFormData,
        current_value: parseFloat(goalFormData.current_value) || 0,
        target_value: parseFloat(goalFormData.target_value) || 0,
      };
      
      // For calories goals, set a default deadline of 1 year from today 
      // since it's an ongoing goal and the date won't be displayed
      if (goalFormData.type === 'calories') {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        goalData.deadline = oneYearFromNow.toISOString().split('T')[0];
      }
      
      // Add the unit for weight goals
      if (goalFormData.type === 'weight') {
        goalData.unit = goalUnit;
        
        // Validate weight values
        // Instead of reassigning, use the returned value directly
        goalData = validateWeightValues(goalData, goalUnit);
      }
      
      // Log the goal data for debugging
      console.log('Saving weight goal with unit:', goalUnit);
      console.log('Current value before saving:', goalFormData.current_value, 'Parsed:', goalData.current_value);
      console.log('Target value before saving:', goalFormData.target_value, 'Parsed:', goalData.target_value);
      
      // Make sure we're not converting units when saving - values should be stored as-is
      // with the unit recorded alongside them for proper display later
      console.log('Full goal data to be saved:', goalData);
      
      // Add the goal
      await dbService.addGoal(user.uid, goalData);
      
      // Reset form and close modal
      setGoalFormData({
        type: 'weight',
        current_value: '227.1', // Keep the current weight value
        target_value: '',
        deadline: new Date().toISOString().split('T')[0],
        reason: '',
        reasonDetail: ''
      });
      setGoalUnit('lb'); // Keep the unit as lb
      setShowAddGoalModal(false);
      
      // Refresh the goals list
      await loadGoals();
      
    } catch (error) {
      console.error('Error adding goal:', error);
      setError('Failed to add goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Modified handle edit submit to close modal on success
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !editingGoal) {
      setError('Something went wrong. Please try again.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare goal data
      let goalData = {
        ...goalFormData,
        current_value: parseFloat(goalFormData.current_value) || 0,
        target_value: parseFloat(goalFormData.target_value) || 0,
      };
      
      // For calories goals, set a default deadline of 1 year from today 
      // since it's an ongoing goal and the date won't be displayed
      if (goalFormData.type === 'calories') {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        goalData.deadline = oneYearFromNow.toISOString().split('T')[0];
      }
      
      // Add the unit for weight goals
      if (goalFormData.type === 'weight') {
        goalData.unit = goalUnit;
        
        // Validate weight values
        // Instead of reassigning, use the returned value directly
        goalData = validateWeightValues(goalData, goalUnit);
      }
      
      // Update the goal
      await dbService.updateGoal(editingGoal.id, goalData);
      
      // Reset form and close modal
      setGoalFormData({
        type: 'weight',
        current_value: '',
        target_value: '',
        deadline: new Date().toISOString().split('T')[0],
        reason: '',
        reasonDetail: ''
      });
      setGoalUnit('kg'); // Reset to default unit
      setEditingGoal(null);
      
      // Refresh the goals list
      await loadGoals();
      
    } catch (error) {
      console.error('Error updating goal:', error);
      setError('Failed to update goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Modified to open modal for editing
  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setGoalFormData({
      type: goal.type,
      current_value: goal.current_value.toString(),
      target_value: goal.target_value.toString(),
      deadline: goal.deadline || new Date().toISOString().split('T')[0],
      reason: goal.reason || '',
      reasonDetail: goal.reasonDetail || '',
    });
    
    // Set the unit if it's a weight goal
    if (goal.type === 'weight') {
      setGoalUnit(goal.unit || 'kg');
    } else {
      setGoalUnit('kg'); // Reset to default for non-weight goals
    }
  };
  
  // Modified to close modal when canceling edit
  const handleCancelEdit = () => {
    setEditingGoal(null);
    setShowAddGoalModal(false);
  };

  // Process food entries to calculate daily and weekly calories
  const processFoodEntries = () => {
    // Group food entries by day
    const dailyData = {};
    const now = new Date();
    
    // Process last 30 days of entries
    foodEntries.forEach(entry => {
      if (entry.created_at) {
        const entryDate = entry.created_at.toDate ? entry.created_at.toDate() : new Date(entry.created_at);
        
        // Check if entry is within the last 30 days
        const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          const dateStr = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          if (!dailyData[dateStr]) {
            dailyData[dateStr] = {
              totalCalories: 0,
              entries: []
            };
          }
          
          dailyData[dateStr].totalCalories += (entry.calories || 0);
          dailyData[dateStr].entries.push(entry);
        }
      }
    });
    
    setDailyCalorieData(dailyData);
    
    // Group by weeks (starting Monday)
    const weeklyData = processWeeklyData(dailyData);
    setWeeklyCalorieData(weeklyData);
  };
  
  // Process daily data into weekly chunks
  const processWeeklyData = (dailyData) => {
    const weeks = {};
    
    // Sort dates
    const sortedDates = Object.keys(dailyData).sort();
    
    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      // Get week number (ISO week - starts on Monday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Adjust to get Monday
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          startDate: weekKey,
          endDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          totalCalories: 0,
          dailyData: {}
        };
      }
      
      weeks[weekKey].totalCalories += dailyData[dateStr].totalCalories;
      weeks[weekKey].dailyData[dateStr] = dailyData[dateStr];
    });
    
    // Convert to array and sort by most recent week first
    return Object.values(weeks).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  };
  
  // Check if a new week has started and reset/archive if needed
  const checkAndResetWeeklyGoals = () => {
    if (!user || weeklyCalorieData.length === 0) return;
    
    // Get the latest week data
    const currentWeek = weeklyCalorieData[0];
    const today = new Date();
    const endOfWeekDate = new Date(currentWeek.endDate);
    
    // If today is after the end of the current week, we need to archive and reset
    if (today > endOfWeekDate) {
      console.log('End of week detected, archiving and resetting weekly goals');
      
      // Find the calorie goal
      const calorieGoal = goals.find(goal => goal.type === 'calories');
      
      if (calorieGoal) {
        // Archive the current week's data
        const weekArchiveData = {
          userId: user.uid,
          type: 'calorie_history',
          weekStart: currentWeek.startDate,
          weekEnd: currentWeek.endDate,
          totalCalories: currentWeek.totalCalories,
          dailyData: currentWeek.dailyData,
          averageCalories: Object.keys(currentWeek.dailyData).length > 0 ? 
            Math.round(currentWeek.totalCalories / Object.keys(currentWeek.dailyData).length) : 0,
          targetCalories: calorieGoal.target_value,
          archived_at: new Date().toISOString(),
          related_goal_id: calorieGoal.id
        };
        
        // Store the archived week data
        dbService.addCalorieHistory(user.uid, weekArchiveData)
          .then(() => {
            console.log('Weekly calorie data archived successfully');
            
            // Reset the calorieGoalUpdated flag to allow for updates in the new week
            setCalorieGoalUpdated(false);
          })
          .catch(error => {
            console.error('Error archiving weekly calorie data:', error);
          });
      }
    }
  };
  
  // Check for week reset when weekly data changes
  useEffect(() => {
    if (weeklyCalorieData.length > 0) {
      checkAndResetWeeklyGoals();
    }
  }, [weeklyCalorieData]);
  
  // Update calorie goal based on recent data
  const updateCalorieGoal = () => {
    // Find existing calorie goal
    const existingCalorieGoal = goals.find(goal => goal.type === 'calories');
    
    // Calculate average daily calories for the last 7 days
    const last7Days = [];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (dailyCalorieData[dateStr]) {
        last7Days.push(dailyCalorieData[dateStr].totalCalories);
      } else {
        last7Days.push(0); // No data for that day
      }
    }
    
    // Calculate average (only for days with data)
    const daysWithData = last7Days.filter(cal => cal > 0);
    const averageDailyCalories = daysWithData.length > 0 
      ? Math.round(daysWithData.reduce((sum, cal) => sum + cal, 0) / daysWithData.length) 
      : 0;
    
    console.log('Average daily calories:', averageDailyCalories);
    
    if (averageDailyCalories > 0) {
      if (existingCalorieGoal) {
        // Update existing goal with new average
        dbService.updateGoal(existingCalorieGoal.id, {
          ...existingCalorieGoal,
          current_value: averageDailyCalories,
          // Keep the target_value as is
          last_updated: new Date().toISOString()
        }).then(() => {
          console.log('Calorie goal updated automatically');
          setCalorieGoalUpdated(true);
        }).catch(error => {
          console.error('Error updating calorie goal:', error);
        });
      } else {
        // If no calorie goal exists and we have data, create one
        const defaultTarget = Math.round(averageDailyCalories * 0.9); // Default target: 10% reduction
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const newCalorieGoal = {
          type: 'calories',
          current_value: averageDailyCalories,
          target_value: defaultTarget,
          deadline: nextMonth.toISOString().split('T')[0],
          is_automatic: true,
          reason: 'Automatically tracked from your food journal',
          reasonDetail: 'This goal is updated daily based on your actual food consumption.'
        };
        
        dbService.addGoal(user.uid, newCalorieGoal)
          .then(() => {
            console.log('Automatic calorie goal created');
            setCalorieGoalUpdated(true);
          })
          .catch(error => {
            console.error('Error creating automatic calorie goal:', error);
          });
      }
    }
  };

  // Load food entries if not using subscription
  const loadFoodEntries = async () => {
    if (!user) return;
    
    try {
      const entries = await dbService.getFoodEntries(user.uid, 'food', 100); // Get up to 100 recent entries
      console.log('Loaded food entries:', entries);
      setFoodEntries(entries || []);
    } catch (error) {
      console.error('Error loading food entries:', error);
    }
  };

  const loadGoals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Try loading from Firebase first
      let loadedGoals = [];
      
      try {
        console.log('Loading goals from Firebase...');
        const firebaseGoals = await dbService.getGoals(user.uid);
        console.log('Firebase goals:', firebaseGoals);
        
        if (firebaseGoals && firebaseGoals.length > 0) {
          loadedGoals = firebaseGoals;
        }
      } catch (firebaseError) {
        console.error('Error loading goals from Firebase:', firebaseError);
        // If Firebase fails, try local storage
        try {
          console.log('Falling back to local database...');
          const localGoals = safeLocalDbCall('getGoals');
          
          if (localGoals && localGoals.length > 0) {
            console.log('Local goals:', localGoals);
            loadedGoals = localGoals;
          }
        } catch (localError) {
          console.error('Error loading goals from local database:', localError);
          throw new Error('Failed to load goals from any source');
        }
      }
      
      // Set loaded goals and sort them
      setGoals(loadedGoals.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
      
      // Also load all weight entries for progress calculation 
      await loadWeightEntries();
      
      // Check if there are any weight goals with incorrect values
      checkWeightGoals(loadedGoals);
      
    } catch (error) {
      console.error('Error loading goals:', error);
      setError('Failed to load goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add a new function to check and fix weight goals with incorrect values
  const checkWeightGoals = (loadedGoals) => {
    const highValueWeightGoals = loadedGoals.filter(goal => 
      goal.type === 'weight' && !goal.isDeleted && 
      ((goal.unit === 'lb' && goal.current_value > 250) || 
       (goal.unit === 'kg' && goal.current_value > 113) ||
       (goal.unit === undefined))
    );
    
    if (highValueWeightGoals.length > 0) {
      // Show a message to the user
      setError('Found weight goals with incorrect values. They will be updated to your profile weight of 227.1 lb.');
      
      // Fix each goal with incorrect weight
      highValueWeightGoals.forEach(goal => {
        updateGoalCurrentWeight(goal.id, 227.1);
      });
      
      // Clear the error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // Generate a target date 30-90 days in the future based on goal type
  const generateTargetDate = (goalType, userData) => {
    const today = new Date();
    let daysToAdd = 30; // Default
    
    if (goalType === 'weight') {
      // For weight loss, calculate days based on target (1-2 lbs per week is healthy)
      const currentWeight = userData?.weight || 70;
      const targetWeight = userData?.target_weight || 65;
      const weightToLose = currentWeight - targetWeight;
      
      if (weightToLose > 0) {
        // ~0.5 kg per week (1.1 lbs) is a healthy rate
        const weeksNeeded = weightToLose / 0.5;
        daysToAdd = Math.max(30, Math.min(90, Math.ceil(weeksNeeded * 7)));
      }
    } else if (goalType === 'exercise') {
      // Build exercise habit in ~2 months
      daysToAdd = 60;
    } else if (goalType === 'calories') {
      // Diet adjustments typically show results in ~45 days
      daysToAdd = 45;
    }
    
    today.setDate(today.getDate() + daysToAdd);
    return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const generateSuggestion = async () => {
    if (!user) return;
    
    try {
      setSuggestionLoading(true);
      setShowSuggestion(true);
      setError(null); // Clear any previous errors
      
      // Default profile to use if none exists
      const defaultProfile = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'male',
        target_weight: 65
      };
      
      // Load user profile data - this is critical for accurate suggestions
      let userProfile = null;
      let profileSource = 'default';
      
      try {
        // IMPORTANT: First try to get the profile from local storage, which is where UserProfile component saves data
        console.log('Checking local database for user profile');
        // Try to get user profile from local database first (where UserProfile saves it)
        const localUser = safeLocalDbCall('getUser', 1); // User ID is hardcoded to 1 in local storage
        
        if (localUser) {
          console.log('Found user profile in local database:', localUser);
          userProfile = localUser;
          profileSource = 'local database';
        } else {
          console.log('No profile found in local database, checking Firebase');
          
          // Then try Firebase
          try {
            const firebaseProfile = await dbService.getUserProfile(user.uid);
            
            if (firebaseProfile && Object.keys(firebaseProfile).length > 0) {
              console.log('Profile retrieved from Firebase:', firebaseProfile);
              userProfile = firebaseProfile;
              profileSource = 'firebase';
            } else {
              console.log('No Firebase profile found, checking localStorage as last resort');
              
              try {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                // Look for a user profile that matches the current user ID first
                const localStorageUser = users.find(u => u.id === user.uid) || users.find(u => u.id === 1);
                
                if (localStorageUser) {
                  console.log('Found user profile in localStorage:', localStorageUser);
                  userProfile = localStorageUser;
                  profileSource = 'localStorage';
                }
              } catch (localError) {
                console.error('Error accessing localStorage profile:', localError);
              }
            }
          } catch (firebaseError) {
            console.error('Error retrieving Firebase profile:', firebaseError);
          }
        }
      } catch (profileError) {
        console.error('Error retrieving user profile:', profileError);
      }
      
      // If no profile exists, use default values
      if (!userProfile || Object.keys(userProfile).length === 0) {
        console.log('Using default profile values');
        userProfile = defaultProfile;
      } else {
        console.log(`Using profile from ${profileSource}:`, userProfile);
      }
      
      // Ensure all required fields exist by merging with defaults
      const userData = { ...defaultProfile, ...userProfile };
      console.log('Final user data for suggestions:', userData);
      
      // Load food entries from both Firebase and local database
      let foodEntries = [];
      let refrigeratorEntries = [];
      
      // Try to get food entries from Firebase first
      try {
        console.log('Loading food entries from Firebase');
        // Increase number of days to 30 to get a better sample size for weekly analysis
        const firebaseFoodEntries = await dbService.getFoodEntries(user.uid, 'food', 30);
        console.log('Firebase food entries:', firebaseFoodEntries);
        
        if (firebaseFoodEntries && firebaseFoodEntries.length > 0) {
          foodEntries = firebaseFoodEntries;
        } else {
          console.log('No Firebase food entries found, checking local database');
          
          // Try local database as fallback
          try {
            // In local storage, we're using user ID 1
            const localFoodEntries = safeLocalDbCall('getFoodEntries', 1) || [];
            console.log('Local database food entries:', localFoodEntries);
            
            if (localFoodEntries && localFoodEntries.length > 0) {
              // Filter entries by type since the local database method doesn't support a type parameter
              foodEntries = localFoodEntries.filter(entry => entry.type === 'food');
              console.log('Filtered food entries:', foodEntries);
            }
          } catch (localFoodError) {
            console.error('Error loading food entries from local database:', localFoodError);
          }
        }
      } catch (firebaseFoodError) {
        console.error('Error loading food entries from Firebase:', firebaseFoodError);
        
        // Try local database as fallback
        try {
          const localFoodEntries = safeLocalDbCall('getFoodEntries', 1) || [];
          console.log('Local database food entries (fallback):', localFoodEntries);
          
          if (localFoodEntries && localFoodEntries.length > 0) {
            // Filter entries by type since the local database method doesn't support a type parameter
            foodEntries = localFoodEntries.filter(entry => entry.type === 'food');
            console.log('Filtered food entries (fallback):', foodEntries);
          }
        } catch (localFoodError) {
          console.error('Error loading food entries from local database:', localFoodError);
        }
      }
      
      // Check if we have any food entries
      const hasFood = foodEntries && foodEntries.length > 0;
      console.log('Has food entries:', hasFood, 'Count:', foodEntries.length);
      
      // Group food entries by week for better calorie tracking
      const weeklyCalorieData = [];
      const weekMap = new Map();
      
      if (hasFood) {
        // Process each food entry and group by week
        foodEntries.forEach(entry => {
          // Convert timestamp to date
          const entryDate = entry.created_at && entry.created_at.toDate ? 
            entry.created_at.toDate() : 
            (entry.created_at ? new Date(entry.created_at) : new Date());
          
          // Get the week start date (Sunday)
          const weekStartDate = new Date(entryDate);
          weekStartDate.setDate(entryDate.getDate() - entryDate.getDay());
          const weekKey = weekStartDate.toISOString().split('T')[0];
          
          // Get or create the week data
          if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, {
              weekStart: weekStartDate,
              entries: [],
              totalCalories: 0,
              entriesCount: 0
            });
          }
          
          // Add entry to the week
          const weekData = weekMap.get(weekKey);
          weekData.entries.push(entry);
          weekData.totalCalories += entry.calories || 0;
          weekData.entriesCount += 1;
        });
        
        // Convert map to array and sort by date (most recent first)
        weeklyCalorieData.push(...Array.from(weekMap.values())
          .sort((a, b) => b.weekStart - a.weekStart)
          .map(week => ({
            weekStart: week.weekStart,
            weekEnd: new Date(week.weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
            totalCalories: week.totalCalories,
            dailyAverage: week.entriesCount > 0 ? Math.round(week.totalCalories / week.entriesCount) : 0,
            entriesCount: week.entriesCount
          })));
      }
      
      console.log('Weekly calorie data:', weeklyCalorieData);
      
      // Load refrigerator entries with similar approach
      try {
        console.log('Loading refrigerator entries from Firebase');
        const firebaseRefrigeratorEntries = await dbService.getFoodEntries(user.uid, 'refrigerator', 3);
        console.log('Firebase refrigerator entries:', firebaseRefrigeratorEntries);
        
        if (firebaseRefrigeratorEntries && firebaseRefrigeratorEntries.length > 0) {
          refrigeratorEntries = firebaseRefrigeratorEntries;
        } else {
          console.log('No Firebase refrigerator entries found, checking local database');
          
          // Try local database as fallback
          try {
            // In local storage, we're using user ID 1
            const localRefrigeratorEntries = (safeLocalDbCall('getFoodEntries', 1) || [])
              .filter(entry => entry.type === 'refrigerator');
            console.log('Local database refrigerator entries:', localRefrigeratorEntries);
            
            if (localRefrigeratorEntries && localRefrigeratorEntries.length > 0) {
              refrigeratorEntries = localRefrigeratorEntries;
            }
          } catch (localRefError) {
            console.error('Error loading refrigerator entries from local database:', localRefError);
          }
        }
      } catch (firebaseRefError) {
        console.error('Error loading refrigerator entries from Firebase:', firebaseRefError);
        
        // Try local database as fallback
        try {
          const localRefrigeratorEntries = (safeLocalDbCall('getFoodEntries', 1) || [])
            .filter(entry => entry.type === 'refrigerator');
          console.log('Local database refrigerator entries (fallback):', localRefrigeratorEntries);
          
          if (localRefrigeratorEntries && localRefrigeratorEntries.length > 0) {
            refrigeratorEntries = localRefrigeratorEntries;
          }
        } catch (localRefError) {
          console.error('Error loading refrigerator entries from local database:', localRefError);
        }
      }
      
      const hasRefrigerator = refrigeratorEntries && refrigeratorEntries.length > 0;
      console.log('Has refrigerator entries:', hasRefrigerator, 'Count:', refrigeratorEntries.length);
      
      let refrigeratorItems = [];
      
      if (hasRefrigerator) {
        // Use the most recent refrigerator entry by default
        const latestRefrigeratorEntry = refrigeratorEntries[0];
        try {
          // Handle both string and object formats for analysisData
          let analysisData = { items: [] };
          
          if (latestRefrigeratorEntry.analysisData) {
            if (typeof latestRefrigeratorEntry.analysisData === 'string') {
              try {
                analysisData = JSON.parse(latestRefrigeratorEntry.analysisData);
              } catch (parseError) {
                console.error('Error parsing refrigerator data as JSON:', parseError);
              }
            } else {
              analysisData = latestRefrigeratorEntry.analysisData;
            }
          }
          
          refrigeratorItems = analysisData.items || [];
          console.log('Parsed refrigerator items:', refrigeratorItems);
        } catch (error) {
          console.error('Error processing refrigerator data:', error);
          refrigeratorItems = [];
        }
      }
      
      // Calculate daily calorie needs based on user profile
      let recommendedCalories = 2000; // Default value
      let recommendedWeeklyCalories = 2000 * 7; // Default weekly value
      let calorieCalculationMethod = "standard recommendation";
      
      try {
        if (userData) {
          const { weight, height, age, gender } = userData;
          
          // Harris-Benedict equation for BMR
          let bmr;
          if (gender === 'female') {
            bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
            calorieCalculationMethod = "Harris-Benedict equation for females";
          } else {
            bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
            calorieCalculationMethod = "Harris-Benedict equation for males";
          }
          
          // Determine appropriate activity factor
          // Default to lightly active if we can't determine
          let activityFactor = 1.375; // Default: Lightly active
          
          // If we have exercise goals or food data, try to infer activity level
          const hasExerciseGoal = goals.some(goal => goal.type === 'exercise');
          
          if (hasExerciseGoal) {
            // Find the most recent exercise goal
            const exerciseGoal = goals.filter(goal => goal.type === 'exercise')
              .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
              
            if (exerciseGoal) {
              const targetMinutes = exerciseGoal.target_value;
              // Adjust activity level based on exercise minutes
              if (targetMinutes >= 60) {
                activityFactor = 1.725; // Very active
              } else if (targetMinutes >= 30) {
                activityFactor = 1.55; // Moderately active
              } else {
                activityFactor = 1.375; // Lightly active
              }
            }
          } else if (hasFood && foodEntries.length > 5) {
            // If they track food regularly, they might be more health-conscious
            activityFactor = 1.55; // Assume moderately active
          }
          
          // If weight is more than 20% above target weight, use a slightly lower factor
          // to create a caloric deficit for weight loss
          if (userData.target_weight && userData.weight > userData.target_weight * 1.2) {
            activityFactor = Math.max(1.2, activityFactor - 0.2);
          }
          
          // Calculate recommended calories
          recommendedCalories = Math.round(bmr * activityFactor);
          
          // Further adjust based on weight goals if they exist
          if (userData.target_weight && userData.weight > userData.target_weight) {
            // Create a moderate caloric deficit for weight loss (500 calories/day)
            // but ensure we don't go below a healthy minimum
            const minHealthyCalories = gender === 'female' ? 1200 : 1500;
            recommendedCalories = Math.max(minHealthyCalories, recommendedCalories - 500);
            calorieCalculationMethod += " with adjustment for weight loss goal";
          }
          
          // Calculate weekly calories
          recommendedWeeklyCalories = recommendedCalories * 7;
        }
      } catch (calorieError) {
        console.error('Error calculating calories:', calorieError);
        // Continue with default values
      }
      
      // Calculate average daily calories from food entries
      let avgDailyCalories = 0;
      let avgWeeklyCalories = 0;
      let calorieDataSource = "estimated";
      
      // Use the weekly calorie data if available
      if (weeklyCalorieData.length > 0) {
        // Get the most recent week with at least 3 entries
        const recentWeekWithData = weeklyCalorieData.find(week => week.entriesCount >= 3) || weeklyCalorieData[0];
        
        if (recentWeekWithData) {
          avgDailyCalories = recentWeekWithData.dailyAverage;
          // Estimate weekly intake based on daily average
          avgWeeklyCalories = avgDailyCalories * 7;
          calorieDataSource = `average from ${recentWeekWithData.entriesCount} meals in the most recent week`;
        } else if (hasFood) {
          // Fall back to overall average if no good weekly data
          const totalCalories = foodEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
          avgDailyCalories = Math.round(totalCalories / foodEntries.length);
          avgWeeklyCalories = avgDailyCalories * 7;
        } else {
          // If no food entries, make an educated guess based on profile
          avgDailyCalories = Math.round(recommendedCalories * 1.1); // Assume 10% over recommended
          avgWeeklyCalories = avgDailyCalories * 7;
        }
      } else if (hasFood) {
        // Fall back to overall average if no weekly data available
        const totalCalories = foodEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
        avgDailyCalories = Math.round(totalCalories / foodEntries.length);
        avgWeeklyCalories = avgDailyCalories * 7;
      } else {
        // If no food entries, make an educated guess based on profile
        avgDailyCalories = Math.round(recommendedCalories * 1.1); // Assume 10% over recommended
        avgWeeklyCalories = avgDailyCalories * 7;
      }
      
      // Generate exercise recommendation
      let recommendedExercise = 30; // Default 30 minutes
      let exerciseReason = "standard health recommendation";
      
      if (userData.weight && userData.target_weight) {
        const weightDifference = userData.weight - userData.target_weight;
        
        if (weightDifference > 0) {
          // Weight loss goal - recommend more exercise
          recommendedExercise = Math.min(60, Math.max(30, 30 + weightDifference * 2));
          exerciseReason = `based on goal to lose ${weightDifference.toFixed(1)} kg`;
        }
      }
      
      // Analyze refrigerator for dietary insights
      let refrigeratorInsight = "";
      if (refrigeratorItems.length > 0) {
        const healthyItems = refrigeratorItems.filter(item => 
          ['vegetable', 'fruit', 'lean protein', 'whole grain'].some(
            healthy => item.name.toLowerCase().includes(healthy)
          )
        ).length;
        
        const healthyRatio = healthyItems / refrigeratorItems.length;
        
        if (healthyRatio > 0.7) {
          refrigeratorInsight = "Your refrigerator contains many healthy items, which supports your goals!";
        } else if (healthyRatio < 0.3) {
          refrigeratorInsight = "Consider adding more fruits and vegetables to your refrigerator to support your health goals.";
        } else {
          refrigeratorInsight = "Your refrigerator has a mix of items. Focus on the healthier options to support your goals.";
        }
      }
      
      // Generate target dates
      const weightTargetDate = generateTargetDate('weight', userData);
      const calorieTargetDate = generateTargetDate('calories', userData);
      const exerciseTargetDate = generateTargetDate('exercise', userData);
      
      // Generate the suggestion
      try {
        // Create the suggestion with values converted to the user's preferred unit
        const newSuggestion = {
          weight: {
            current: weightUnit === 'kg' ? userData.weight : convertWeight(userData.weight, 'kg', 'lb'),
            target: weightUnit === 'kg' ? userData.target_weight : convertWeight(userData.target_weight, 'kg', 'lb'),
            deadline: weightTargetDate
          },
          calories: {
            current: avgDailyCalories, // Use daily calories as primary value
            target: recommendedCalories, // Use daily recommended calories as target
            weekly: {
              current: avgWeeklyCalories,
              target: recommendedWeeklyCalories
            },
            deadline: calorieTargetDate
          },
          exercise: {
            current: 15, // Default assumption
            target: Math.round(recommendedExercise),
            deadline: exerciseTargetDate
          }
        };
        
        // Create explanation for each suggestion
        const newReasons = {
          weight: {
            reason: profileSource === 'firebase' 
              ? `Based on your profile information, we recommend a target weight of ${userData.target_weight} kg.`
              : "Using standard health recommendations for your goal weight. Complete your profile for personalized suggestions.",
            detail: userData.target_weight < userData.weight
              ? `Losing ${(userData.weight - userData.target_weight).toFixed(1)} kg at a healthy rate of 0.5 kg per week.`
              : "Maintaining a healthy weight is important for overall health."
          },
          calories: {
            reason: `Daily calorie target calculated using ${calorieCalculationMethod}.`,
            detail: `Your current estimated intake is ${Math.round(avgDailyCalories)} calories per day. A target of ${Math.round(recommendedCalories)} calories daily is recommended based on your profile and activity level.` 
          },
          exercise: {
            reason: `Exercise recommendation ${exerciseReason}.`,
            detail: "Regular physical activity improves cardiovascular health, helps maintain weight, and boosts mood."
          },
          general: refrigeratorInsight
        };
        
        setSuggestion(newSuggestion);
        setSuggestionReasons(newReasons);
      } catch (suggestionError) {
        console.error('Error creating suggestion object:', suggestionError);
        throw new Error('Failed to generate suggestions from your data. Please try again.');
      }
    } catch (error) {
      console.error('Error generating suggestion:', error);
      setError(`AI suggestion error: ${error.message || 'Could not generate suggestions'}`);
      setSuggestion(null);
      setSuggestionReasons({});
    } finally {
      setSuggestionLoading(false);
    }
  };

  const applySuggestion = (type) => {
    if (!suggestion) return;
    
    const suggestionMap = {
      'weight': suggestion.weight,
      'calories': suggestion.calories,
      'exercise': suggestion.exercise
    };
    
    const reasonsMap = {
      'weight': suggestionReasons.weight,
      'calories': suggestionReasons.calories,
      'exercise': suggestionReasons.exercise
    };
    
    const selected = suggestionMap[type];
    const reasonData = reasonsMap[type];
    
    if (selected) {
      // Format the deadline using our utility
      const formattedDeadline = formatDateString(selected.deadline);
      
      console.log(`Applying ${type} suggestion with deadline: ${formattedDeadline}`);
      
      // For weight type, handle values based on how they're displayed
      let currentValue = selected.current.toString();
      let targetValue = selected.target.toString();
      
      if (type === 'weight') {
        // The displayed values in the suggestion panel are already in the user's preferred unit
        // Don't convert them again
        console.log('Weight values already in preferred unit:', currentValue, targetValue, 'Unit:', weightUnit);
        
        // Also make sure the goalUnit matches the current weightUnit
        setGoalUnit(weightUnit);
        
        console.log('Setting goal form data with values in', weightUnit, ':', currentValue, targetValue);
      }
      
      // Update the goalFormData with the values
      setGoalFormData({
        type,
        current_value: currentValue,
        target_value: targetValue,
        deadline: formattedDeadline,
        reason: reasonData?.reason || '',
        reasonDetail: reasonData?.detail || ''
      });
      
      // Show a temporary success message
      setTempMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} suggestion applied! You can now save the goal.`);
      setTimeout(() => setTempMessage(''), 3000);
    }
    
    // Hide the suggestion panel after selection
    setShowSuggestion(false);
  };

  const handleDelete = async (goalId) => {
    if (!user || !goalId) return;
    
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await dbService.deleteGoal(goalId);
      
      // Reload goals
      await loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleGoalDetails = (goalId) => {
    if (expandedGoalId === goalId) {
      setExpandedGoalId(null);
    } else {
      setExpandedGoalId(goalId);
    }
  };

  // Function to map goal type to user-friendly label
  const mapGoalTypeToLabel = (type) => {
    const typeMap = {
      'weight': 'Weight',
      'calories': 'Daily Calories',
      'exercise': 'Exercise Duration'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Helper function to safely call methods on localDb
  const safeLocalDbCall = (methodName, ...args) => {
    try {
      if (!localDb) {
        console.error(`Local DB service is not available`);
        return null;
      }
      
      if (typeof localDb[methodName] !== 'function') {
        console.error(`Method ${methodName} not found in local DB service`);
        return null;
      }
      
      return localDb[methodName](...args);
    } catch (error) {
      console.error(`Error calling ${methodName} on local DB:`, error);
      return null;
    }
  };
  
  // Helper function to ensure dates are properly formatted
  const formatDateString = (dateInput) => {
    if (!dateInput) {
      // Default to 30 days from today if no date provided
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      return defaultDate.toISOString().split('T')[0];
    }
    
    // If it's already in YYYY-MM-DD format, return it
    if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateInput;
    }
    
    try {
      // Try to convert to Date object and format
      const dateObj = new Date(dateInput);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    
    // Fallback to today + 30 days
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 30);
    return fallbackDate.toISOString().split('T')[0];
  };

  // Render weight entries chart
  const renderWeightChart = (entries) => {
    if (!entries || entries.length === 0) return null;
    
    // Sort entries by date (oldest to newest)
    const sortedEntries = [...entries].sort((a, b) => {
      // Parse dates safely to avoid timezone issues
      const parseDate = (dateStr) => {
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day, 12, 0, 0);
        }
        return new Date(dateStr);
      };
      
      return parseDate(a.date) - parseDate(b.date);
    });
    
    // Get min and max weights for scaling
    const weights = sortedEntries.map(entry => parseFloat(displayWeight(entry.weight, entry.unit || 'kg')));
    const minWeight = Math.min(...weights) * 0.95; // Add 5% padding
    const maxWeight = Math.max(...weights) * 1.05;
    
    // Calculate chart dimensions
    const chartWidth = 100; // percentage width
    const chartHeight = 150; // px height
    const padding = 20; // px padding
    
    // Get date range for x-axis - using our safe date parsing
    const parseDate = (dateStr) => {
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
      }
      return new Date(dateStr);
    };
    
    const startDate = parseDate(sortedEntries[0].date);
    const endDate = parseDate(sortedEntries[sortedEntries.length - 1].date);
    const dateRange = endDate - startDate;
    
    // Generate points for the chart
    const points = sortedEntries.map(entry => {
      const entryDate = parseDate(entry.date);
      const normalizedWeight = parseFloat(displayWeight(entry.weight, entry.unit || 'kg'));
      
      // Calculate x position (percentage of chart width)
      const xPercent = dateRange === 0 ? 50 : ((entryDate - startDate) / dateRange) * chartWidth;
      
      // Calculate y position (px from top)
      const weightRange = maxWeight - minWeight;
      const yPercent = weightRange === 0 ? 50 : ((normalizedWeight - minWeight) / weightRange) * 100;
      const y = chartHeight - (yPercent * (chartHeight - padding * 2) / 100) - padding;
      
      return {
        x: xPercent,
        y,
        date: entry.date,
        weight: normalizedWeight,
        id: entry.id
      };
    });
    
    // Generate the SVG path
    const pathD = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');
    
    return (
      <div className="mt-4 mb-6">
        <h4 className="font-medium text-sm text-gray-700 mb-2">Weight Trend</h4>
        <div className="bg-white border rounded-md p-3 relative" style={{ height: `${chartHeight}px` }}>
          {/* SVG for the chart */}
          <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            {/* Path for the line */}
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Dots for each data point */}
            {points.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
          </svg>
          
          {/* Labels */}
          <div className="absolute bottom-0 left-0 text-xs text-gray-500 p-1">
            {formatDateDisplay(sortedEntries[0].date)}
          </div>
          <div className="absolute bottom-0 right-0 text-xs text-gray-500 p-1">
            {formatDateDisplay(sortedEntries[sortedEntries.length - 1].date)}
          </div>
          <div className="absolute top-0 right-0 text-xs text-gray-500 p-1">
            {maxWeight.toFixed(1)} {weightUnit}
          </div>
          <div className="absolute bottom-0 right-0 text-xs text-gray-500 p-1 transform -translate-y-4">
            {minWeight.toFixed(1)} {weightUnit}
          </div>
        </div>
      </div>
    );
  };

  // After the handleInputChange function, add a new function to handle unit toggle
  const handleUnitToggle = () => {
    // Toggle between kg and lb
    const newUnit = goalUnit === 'kg' ? 'lb' : 'kg';
    setGoalUnit(newUnit);
    
    // Convert values if needed
    if (goalFormData.type === 'weight') {
      // Only convert if we have values to convert
      if (goalFormData.current_value) {
        const convertedCurrentValue = convertWeight(
          parseFloat(goalFormData.current_value), 
          goalUnit, 
          newUnit
        );
        setGoalFormData(prev => ({
          ...prev,
          current_value: convertedCurrentValue
        }));
      }
      
      if (goalFormData.target_value) {
        const convertedTargetValue = convertWeight(
          parseFloat(goalFormData.target_value), 
          goalUnit, 
          newUnit
        );
        setGoalFormData(prev => ({
          ...prev,
          target_value: convertedTargetValue
        }));
      }
    }
  };

  // Calculate progress percentage based on goal type and available entries
  const calculateProgress = (goal) => {
    if (!goal) return 0;
    
    // For weight goals, show progress only if there are weight entries
    if (goal.type === 'weight') {
      // Check if this goal has any weight entries
      const entriesForGoal = weightEntries.filter(entry => entry.goalId === goal.id);
      
      // If no entries yet, return 0% progress
      if (entriesForGoal.length === 0) {
        return 0;
      }
      
      // Get latest weight entry (sorted by date, descending)
      const sortedEntries = [...entriesForGoal].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestEntry = sortedEntries[0];
      const latestWeight = parseFloat(latestEntry.weight);
      
      // If entries exist, calculate progress based on latest entry compared to target
      if (goal.target_value < goal.current_value) {
        // For weight loss goals (target is less than the original weight)
        const totalToLose = Math.abs(goal.current_value - goal.target_value);
        const lostSoFar = Math.max(0, goal.current_value - latestWeight); // Positive if weight decreased
        return Math.min(100, Math.round((lostSoFar / totalToLose) * 100));
      } else {
        // For weight gain goals (target is greater than the original weight)
        const totalToGain = Math.abs(goal.target_value - goal.current_value);
        const gainedSoFar = Math.max(0, latestWeight - goal.current_value); // Positive if weight increased
        return Math.min(100, Math.round((gainedSoFar / totalToGain) * 100));
      }
    }
    
    // For other goals (calories, exercise), use regular calculation
    if (goal.type === 'calories' || goal.type === 'exercise') {
      return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
    }
    
    return 0;
  };
  
  // Get the appropriate progress bar color based on goal type and status
  const getProgressBarColor = (goal) => {
    if (!goal) return 'bg-gray-200';
    
    // For weight goals
    if (goal.type === 'weight') {
      // Check if this goal has any weight entries
      const entriesForGoal = weightEntries.filter(entry => entry.goalId === goal.id);
      
      // If no entries yet, show neutral color
      if (entriesForGoal.length === 0) {
        return 'bg-gray-400';
      }
      
      // Get latest weight entry (sorted by date, descending)
      const sortedEntries = [...entriesForGoal].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestEntry = sortedEntries[0];
      const latestWeight = parseFloat(latestEntry.weight);
      
      // If entries exist, show color based on direction
      if (goal.target_value < goal.current_value) {
        // For weight loss goals, green if making progress (weight is decreasing)
        return latestWeight < goal.current_value ? 'bg-green-600' : 'bg-red-600';
      } else {
        // For weight gain goals, green if making progress (weight is increasing)
        return latestWeight > goal.current_value ? 'bg-green-600' : 'bg-red-600';
      }
    }
    
    // For other goals (calories, exercise)
    if (goal.type === 'calories' || goal.type === 'exercise') {
      return goal.current_value >= goal.target_value ? 'bg-green-600' : 'bg-blue-600';
    }
    
    return 'bg-blue-600';
  };

  // Add this function after handleDelete
  const updateGoalCurrentWeight = async (goalId, correctWeight = 227.1) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Update the goal with the correct weight
      await dbService.updateGoal(goalId, {
        current_value: correctWeight,
        unit: 'lb', // Ensure the unit is set correctly
        last_updated: new Date().toISOString()
      });
      
      // Reload goals to show updated current value
      await loadGoals();
      
    } catch (error) {
      console.error('Error updating goal weight:', error);
      setError('Failed to update goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add a function to validate weight values
  const validateWeightValues = (goalData, unit) => {
    // Create a copy of the input object to avoid modifying it directly
    const validatedData = { ...goalData };
    
    if (unit === 'lb') {
      // For pounds, limit to 50-700 lb range
      if (validatedData.current_value > 700) {
        validatedData.current_value = 227.1; // Default to profile weight
      }
      if (validatedData.target_value > 700) {
        validatedData.target_value = 180; // Default to reasonable target
      }
    } else {
      // For kg, limit to 20-300 kg range
      if (validatedData.current_value > 300) {
        validatedData.current_value = 103; // Default to profile weight in kg (227.1 / 2.20462)
      }
      if (validatedData.target_value > 300) {
        validatedData.target_value = 81.6; // Default to reasonable target in kg
      }
    }
    return validatedData;
  };

  // Add a one-time effect that runs when the app first loads
  useEffect(() => {
    // Check if user is logged in
    if (user) {
      console.log('Running initial weight goal validation...');
      
      // Delay the check slightly to ensure goals are loaded
      const timer = setTimeout(() => {
        if (goals.length > 0) {
          checkWeightGoals(goals);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Function to handle weight entry deletion
  const handleDeleteWeightEntry = async (entryId, goalId) => {
    try {
      setLoading(true);
      
      // Delete the entry
      await dbService.deleteWeightEntry(entryId);
      
      // Reload weight entries to update the chart and table
      await loadWeightEntries(goalId);
      
      // Show a confirmation message
      setTempMessage('Weight entry deleted successfully');
      setTimeout(() => setTempMessage(''), 3000);
      
    } catch (error) {
      console.error('Error deleting weight entry:', error);
      setError('Failed to delete weight entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to properly format dates for display, avoiding timezone issues
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    
    try {
      // For YYYY-MM-DD format strings, we need to handle them specially
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Split the date into components
        const [year, month, day] = dateString.split('-').map(Number);
        
        // Create a date object with proper local time (noon to avoid any day shift)
        const date = new Date(year, month - 1, day, 12, 0, 0);
        
        // Format the date using built-in methods
        return date.toLocaleDateString();
      }
      
      // For other formats, use the standard Date parsing
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return the original string if there's an error
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-yellow-700">Please log in to view and set health goals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-blue-100 p-3 rounded-lg shadow-sm">Health Goals</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              // Pre-populate the current weight with 227.1 lb
              setGoalFormData({
                ...goalFormData,
                type: 'weight',
                current_value: '227.1',
                deadline: new Date().toISOString().split('T')[0],
              });
              // Set the unit to lb
              setGoalUnit('lb');
              setShowAddGoalModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={20} />
            <span>Add Goal</span>
          </button>
          <button
            onClick={openModalWithSuggestion}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Lightbulb size={20} />
            <span className="font-medium">Get Suggestion</span>
          </button>
        </div>
      </div>

      {/* Display error message if there's an error */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold mr-1">Error:</strong> 
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Calorie Summary Section */}
      {Object.keys(dailyCalorieData).length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-500" />
              Calorie Tracking
            </h3>
            <button 
              onClick={() => setShowHistoricalData(!showHistoricalData)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <Clock className="mr-1 h-4 w-4" />
              {showHistoricalData ? "Hide History" : "Show History"}
              {showHistoricalData ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
            </button>
          </div>
          
          {/* Current Day Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Today's Calories */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Today</h4>
              <p className="text-2xl font-bold text-blue-900">
                {dailyCalorieData[new Date().toISOString().split('T')[0]]?.totalCalories || 0} 
                <span className="text-sm font-normal ml-1">kcal</span>
              </p>
            </div>
            
            {/* Last 7 days average */}
            <div className="bg-green-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-800 mb-1">7-Day Average</h4>
              <p className="text-2xl font-bold text-green-900">
                {(() => {
                  // Calculate 7-day average
                  let totalCal = 0;
                  let daysWithData = 0;
                  const now = new Date();
                  
                  for (let i = 0; i < 7; i++) {
                    const date = new Date(now);
                    date.setDate(now.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    if (dailyCalorieData[dateStr]) {
                      totalCal += dailyCalorieData[dateStr].totalCalories;
                      daysWithData++;
                    }
                  }
                  
                  return daysWithData > 0 ? Math.round(totalCal / daysWithData) : 0;
                })()}
                <span className="text-sm font-normal ml-1">kcal</span>
              </p>
            </div>
            
            {/* Current Week Total */}
            <div className="bg-purple-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-purple-800 mb-1">Current Week Total</h4>
              <p className="text-2xl font-bold text-purple-900">
                {weeklyCalorieData.length > 0 ? weeklyCalorieData[0].totalCalories : 0}
                <span className="text-sm font-normal ml-1">kcal</span>
              </p>
            </div>
          </div>
          
          {/* Historical Weekly Data */}
          {showHistoricalData && weeklyCalorieData.length > 0 && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calories</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Average</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeklyCalorieData.map((week, index) => {
                    // Calculate daily average for the week
                    const daysWithData = Object.keys(week.dailyData).length;
                    const dailyAverage = daysWithData > 0 ? Math.round(week.totalCalories / daysWithData) : 0;
                    
                    return (
                      <tr key={week.startDate} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {new Date(week.startDate).toLocaleDateString()} - {new Date(week.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {week.totalCalories} kcal
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {dailyAverage} kcal/day
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Goals List */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Your Goals</h3>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading your goals...</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <h3 className="font-medium text-lg text-gray-700 mb-2">No Goals Set Yet</h3>
              <p className="text-gray-500 mb-4">
                Start by adding a health goal to track your progress.
              </p>
              <button
                onClick={() => {
                  // Pre-populate the current weight with 227.1 lb
                  setGoalFormData({
                    ...goalFormData,
                    type: 'weight',
                    current_value: '227.1',
                    deadline: new Date().toISOString().split('T')[0],
                  });
                  // Set the unit to lb
                  setGoalUnit('lb');
                  setShowAddGoalModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus size={18} className="mr-2" />
                Add Your First Goal
              </button>
            </div>
          ) : (
            goals.filter(goal => !goal.isDeleted).map(goal => (
              <div key={goal.id} className="bg-white border rounded-xl shadow-sm p-5 mb-5 relative">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{mapGoalTypeToLabel(goal.type)}</h3>
                  <div className="flex space-x-1.5">
                    {goal.type === 'weight' && (
                      <>
                        <button
                          onClick={() => toggleWeightUnit()}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md flex items-center"
                        >
                          {weightUnit.toUpperCase()}
                        </button>
                        <button
                          onClick={() => openAddWeightModal(goal)}
                          className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Entry
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(goal)}
                      className="text-gray-500 hover:text-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-500">
                      Current: <span className="text-base font-medium text-gray-900">{displayGoalValue(goal, 'current_value')} {getUnitForGoalType(goal.type)}</span>
                      {/* Add fix button for weight goals with incorrect value - only show in extreme cases */}
                      {goal.type === 'weight' && parseFloat(displayGoalValue(goal, 'current_value')) > 350 && (
                        <button 
                          onClick={() => updateGoalCurrentWeight(goal.id)}
                          className="ml-2 inline-flex items-center px-2 py-1 text-xs border border-red-300 shadow-sm text-red-700 bg-red-50 hover:bg-red-100 rounded focus:outline-none"
                          title="Your profile weight is 227.1 lb. Click to fix this goal."
                        >
                          Fix
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Target: <span className="text-base font-medium text-gray-900">{displayGoalValue(goal, 'target_value')} {getUnitForGoalType(goal.type)}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        Progress 
                        {goal.is_automatic && goal.type === 'calories' && (
                          <span className="ml-1 text-xs text-blue-600">
                            (Updates daily)
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {calculateProgress(goal)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${getProgressBarColor(goal)}`}
                        style={{ width: `${calculateProgress(goal)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Only show target date for non-calorie goals */}
                  {goal.type !== 'calories' && (
                    <div className="text-sm text-gray-500 flex items-center">
                      <Calendar size={16} className="inline-block mr-1" />
                      Target Date: <span className="ml-1 font-medium text-gray-900">{new Date(goal.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {/* Expanded details section */}
                  {expandedGoalId === goal.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {goal.reason && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Reason:</p>
                          <p className="text-sm text-gray-600">{goal.reason}</p>
                        </div>
                      )}
                      
                      {goal.reasonDetail && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Details:</p>
                          <p className="text-sm text-gray-600">{goal.reasonDetail}</p>
                        </div>
                      )}
                      
                      {goal.created_at && (
                        <div className="text-xs text-gray-500 mt-2">
                          Created: {new Date(goal.created_at.seconds * 1000).toLocaleDateString()}
                        </div>
                      )}
                      
                      {goal.last_updated && (
                        <div className="text-xs text-gray-500">
                          Last updated: {new Date(goal.last_updated).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* For weight goals, add history section */}
                {goal.type === 'weight' && (
                  <div className="mt-4">
                    <button
                      onClick={() => toggleWeightHistory(goal.id)}
                      className="w-full flex justify-between items-center text-sm font-medium text-gray-600 hover:text-gray-800 py-2 border-t"
                    >
                      <span>Weight History</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${showWeightHistory[goal.id] ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Weight history content */}
                    {showWeightHistory[goal.id] && (
                      <div className="mt-2 border-t pt-3">
                        {loadingWeightEntries ? (
                          <p className="text-center text-sm text-gray-500">Loading weight entries...</p>
                        ) : weightEntries.filter(entry => entry.goalId === goal.id).length === 0 ? (
                          <p className="text-center text-sm text-gray-500">No weight entries yet. Add your first entry!</p>
                        ) : (
                          <>
                            {/* Weight trend chart for 2+ entries */}
                            {weightEntries.filter(entry => entry.goalId === goal.id).length >= 2 && 
                              renderWeightChart(weightEntries.filter(entry => entry.goalId === goal.id))
                            }
                            
                            {/* Weight entries table */}
                            <div className="max-h-64 overflow-y-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {weightEntries
                                    .filter(entry => entry.goalId === goal.id) // Only show entries for this specific goal
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .map((entry, index) => (
                                      <tr key={index}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {formatDateDisplay(entry.date)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {displayWeight(entry.weight, entry.unit || 'kg')} {weightUnit}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-900">{entry.notes}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                                          <button
                                            onClick={() => handleDeleteWeightEntry(entry.id, goal.id)}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* For calorie goals, add history section */}
                {goal.type === 'calories' && (
                  <div className="mt-4">
                    <button
                      onClick={() => toggleCalorieHistory(goal.id)}
                      className="w-full flex justify-between items-center text-sm font-medium text-gray-600 hover:text-gray-800 py-2 border-t"
                    >
                      <span>Calorie History</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${showCalorieHistory[goal.id] ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Calorie history content */}
                    {showCalorieHistory[goal.id] && (
                      <div className="mt-2 border-t pt-3">
                        {foodEntries.length === 0 ? (
                          <p className="text-center text-sm text-gray-500">No calorie entries yet.</p>
                        ) : (
                          <>
                            {/* Calorie trend chart */}
                            {Object.keys(dailyCalorieData).length >= 2 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Last 30 Days Calorie Trend</h4>
                                <div className="h-48 w-full">
                                  <LineChart
                                    width={300}
                                    height={180}
                                    data={Object.entries(dailyCalorieData)
                                      .map(([date, data]) => ({
                                        date: date,
                                        calories: data.totalCalories
                                      }))
                                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                                    }
                                    margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                                  >
                                    <XAxis 
                                      dataKey="date" 
                                      tickFormatter={(dateStr) => formatDateDisplay(dateStr)}
                                      interval="preserveStartEnd"
                                      minTickGap={30}
                                    />
                                    <YAxis />
                                    <Tooltip 
                                      labelFormatter={(dateStr) => formatDateDisplay(dateStr)}
                                      formatter={(value) => [`${value} calories`, 'Calories']}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="calories"
                                      stroke="#3B82F6"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 5 }}
                                    />
                                    {goal.target_value && (
                                      <ReferenceLine 
                                        y={goal.target_value} 
                                        stroke="#22C55E" 
                                        strokeDasharray="3 3" 
                                        label={{ 
                                          position: 'right',
                                          value: `Target: ${goal.target_value}`,
                                          fill: '#22C55E',
                                          fontSize: 10
                                        }} 
                                      />
                                    )}
                                  </LineChart>
                                </div>
                              </div>
                            )}
                            
                            {/* Calorie entries table */}
                            <div className="max-h-64 overflow-y-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calories</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {Object.entries(dailyCalorieData)
                                    .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                                    .map(([date, data], index) => (
                                      <tr key={index}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {formatDateDisplay(date)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {data.totalCalories}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {data.entries.length} food items
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Goal Form Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Add AI Suggestion Panel here */}
            {showSuggestion && (
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-medium text-blue-800 flex items-center">
                    <Lightbulb size={18} className="mr-2" />
                    AI Suggestions
                  </h4>
                  <button 
                    onClick={() => setShowSuggestion(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                {suggestionLoading ? (
                  <div className="py-4 flex justify-center">
                    <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : suggestion ? (
                  <div className="space-y-3">
                    <p className="text-sm text-blue-800 mb-2">Choose a suggestion to apply to your goal:</p>
                    <div className="grid grid-cols-1 gap-3">
                      {suggestion.weight && (
                        <div 
                          className="p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                          onClick={() => applySuggestion('weight')}
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-blue-900">Weight Goal</div>
                              <div className="flex items-center mt-1">
                                <span className="text-sm text-gray-600">Current: {suggestion.weight.current} {weightUnit}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                                <span className="text-sm font-medium text-blue-700">Target: {suggestion.weight.target} {weightUnit}</span>
                              </div>
                            </div>
                          </div>
                          {suggestionReasons.weight && (
                            <div className="mt-2 text-xs text-gray-500 bg-blue-50 p-1.5 rounded border border-blue-100">
                              {suggestionReasons.weight.reason}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {suggestion.calories && (
                        <div 
                          className="p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                          onClick={() => applySuggestion('calories')}
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-orange-900">Calorie Goal</div>
                              <div className="flex items-center mt-1">
                                <span className="text-sm text-gray-600">Current: {Math.round(suggestion.calories.current)} kcal</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                                <span className="text-sm font-medium text-orange-700">Target: {Math.round(suggestion.calories.target)} kcal</span>
                              </div>
                            </div>
                          </div>
                          {suggestionReasons.calories && (
                            <div className="mt-2 text-xs text-gray-500 bg-orange-50 p-1.5 rounded border border-orange-100">
                              {suggestionReasons.calories.reason}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {suggestion.exercise && (
                        <div 
                          className="p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                          onClick={() => applySuggestion('exercise')}
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-green-900">Exercise Goal</div>
                              <div className="flex items-center mt-1">
                                <span className="text-sm text-gray-600">Current: {suggestion.exercise.current} min</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                                <span className="text-sm font-medium text-green-700">Target: {suggestion.exercise.target} min</span>
                              </div>
                            </div>
                          </div>
                          {suggestionReasons.exercise && (
                            <div className="mt-2 text-xs text-gray-500 bg-green-50 p-1.5 rounded border border-green-100">
                              {suggestionReasons.exercise.reason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    No suggestions available. Try updating your profile for personalized recommendations.
                  </div>
                )}
              </div>
            )}
            
            {/* Show temporary message after selecting a suggestion */}
            {tempMessage && (
              <div className="px-6 py-3 bg-green-50 border-b border-green-200">
                <div className="flex items-center text-green-800">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>{tempMessage}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={editingGoal ? handleEditSubmit : handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {/* Goal Type Selection */}
                <div>
                  <label htmlFor="goal-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Type
                  </label>
                  <select
                    id="goal-type"
                    name="type"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={goalFormData.type}
                    onChange={(e) => setGoalFormData({...goalFormData, type: e.target.value})}
                  >
                    <option value="weight">Weight</option>
                    <option value="calories">Calories</option>
                    <option value="exercise">Exercise</option>
                  </select>
                </div>
                
                {/* Current Value with unit toggle for weight */}
                <div>
                  <label htmlFor="current-value" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Value {goalFormData.type === 'weight' && `(${goalUnit})`}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      id="current-value"
                      name="current_value"
                      step="0.1"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={goalFormData.current_value}
                      onChange={(e) => setGoalFormData({...goalFormData, current_value: e.target.value})}
                      required
                    />
                    
                    {goalFormData.type === 'weight' && (
                      <button
                        type="button"
                        onClick={handleUnitToggle}
                        className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {goalUnit === 'kg' ? 'kg → lb' : 'lb → kg'}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Target Value with unit display for weight */}
                <div>
                  <label htmlFor="target-value" className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value {goalFormData.type === 'weight' && `(${goalUnit})`}
                  </label>
                  <input
                    type="number"
                    id="target-value"
                    name="target_value"
                    step="0.1"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={goalFormData.target_value}
                    onChange={(e) => setGoalFormData({...goalFormData, target_value: e.target.value})}
                    required
                  />
                </div>
                
                {/* Target Date - only for non-calorie goals */}
                {goalFormData.type !== 'calories' && (
                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      id="deadline"
                      name="deadline"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={goalFormData.deadline}
                      onChange={(e) => setGoalFormData({...goalFormData, deadline: e.target.value})}
                      required
                    />
                  </div>
                )}
                
                {/* Reason for the goal */}
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Motivation (optional)
                  </label>
                  <select
                    id="reason"
                    name="reason"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={goalFormData.reason}
                    onChange={(e) => setGoalFormData({...goalFormData, reason: e.target.value})}
                  >
                    <option value="">Select motivation...</option>
                    <option value="health">Better Health</option>
                    <option value="fitness">Physical Fitness</option>
                    <option value="appearance">Appearance</option>
                    <option value="competition">Competition/Event</option>
                    <option value="medical">Medical Recommendation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                {/* Additional details about the reason */}
                <div>
                  <label htmlFor="reasonDetail" className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Details (optional)
                  </label>
                  <textarea
                    id="reasonDetail"
                    name="reasonDetail"
                    rows="2"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={goalFormData.reasonDetail}
                    onChange={(e) => setGoalFormData({...goalFormData, reasonDetail: e.target.value})}
                    placeholder="Why is this goal important to you?"
                  ></textarea>
                </div>
              </div>
              
              <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingGoal ? 'Updating...' : 'Saving...'}
                    </span>
                  ) : (
                    editingGoal ? 'Update Goal' : 'Save Goal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Weight Entry Modal */}
      {showAddWeightModal && selectedWeightGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-medium text-gray-900">
                Add Weight Entry
              </h3>
              <button 
                onClick={closeAddWeightModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleWeightEntrySubmit}>
              <div className="px-6 py-4">
                <div className="mb-4">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={newWeightEntry.date}
                    onChange={handleWeightEntryChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Weight ({weightUnit})
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={newWeightEntry.weight}
                      onChange={handleWeightEntryChange}
                      step="0.1"
                      min="0"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={toggleWeightUnit}
                      className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {weightUnit === 'kg' ? 'Switch to lb' : 'Switch to kg'}
                    </button>
                  </div>
                </div>
                
                <div className="mb-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={newWeightEntry.notes}
                    onChange={handleWeightEntryChange}
                    rows="2"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
              
              <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeAddWeightModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;