import React, { useState, useEffect } from 'react';
import dbService from '../firebase/dbService'; // Updated to use firebase service
import localDbService from '../db/database'; // Add local database service
import { useAuth } from '../contexts/AuthContext';
import { Lightbulb, Plus, X, Calendar, Edit2, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react'; // Import icons

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

  useEffect(() => {
    if (user) {
      loadGoals();
      // Set up subscription to goals
      const unsubscribe = dbService.subscribeGoals(
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
      
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [user]);

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
      }
      
      // If no goals from Firebase, try local database
      if (loadedGoals.length === 0) {
        try {
          console.log('Loading goals from local database...');
          const localGoals = safeLocalDbCall('getGoals', 1) || [];
          console.log('Local database goals:', localGoals);
          
          if (localGoals && localGoals.length > 0) {
            loadedGoals = localGoals;
          }
        } catch (localError) {
          console.error('Error loading goals from local database:', localError);
        }
      }
      
      // If still no goals, try localStorage directly
      if (loadedGoals.length === 0) {
        try {
          console.log('Loading goals directly from localStorage...');
          const localStorageGoals = JSON.parse(localStorage.getItem('goals') || '[]')
            .filter(goal => goal.userId === 1);
          console.log('localStorage goals:', localStorageGoals);
          
          if (localStorageGoals && localStorageGoals.length > 0) {
            loadedGoals = localStorageGoals;
          }
        } catch (localStorageError) {
          console.error('Error loading goals from localStorage:', localStorageError);
        }
      }
      
      console.log('Final loaded goals:', loadedGoals);
      setGoals(loadedGoals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      setError('Could not load your goals. Please try again later.');
    } finally {
      setLoading(false);
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
          calorieDataSource = `average from ${foodEntries.length} meals`;
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
        calorieDataSource = `average from ${foodEntries.length} meals`;
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
        // Create the suggestion
        const newSuggestion = {
          weight: {
            current: userData.weight,
            target: userData.target_weight,
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
      
      // For all goal types, use standard handling
      setNewGoal({
        ...newGoal,
        type,
        current_value: selected.current.toString(),
        target_value: selected.target.toString(),
        deadline: formattedDeadline,
        // Store the reason data
        reason: reasonData?.reason || '',
        reasonDetail: reasonData?.detail || ''
      });
    }
    
    setShowSuggestion(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      console.log('Form submitted with values:', newGoal);
      
      // Validate inputs
      if (!newGoal.current_value || !newGoal.target_value) {
        throw new Error('Current and target values are required');
      }
      
      // Make sure we're converting the string values to numbers
      const goalData = {
        ...newGoal,
        type: newGoal.type,
        target_value: parseFloat(newGoal.target_value) || 0,
        current_value: parseFloat(newGoal.current_value) || 0,
        deadline: formatDateString(newGoal.deadline), // Format the deadline properly
        // Include reason data if available
        reason: newGoal.reason || '',
        reasonDetail: newGoal.reasonDetail || ''
      };
      
      console.log('Prepared goal data:', goalData);
      
      // Try Firebase first
      let goalSaved = false;
      let addedGoalId = null;
      
      try {
        console.log('Attempting to add goal to Firebase...');
        // Try to add the goal using Firebase
        addedGoalId = await dbService.addGoal(user.uid, goalData);
        console.log('Goal added successfully to Firebase with ID:', addedGoalId);
        goalSaved = true;
      } catch (firebaseError) {
        console.error('Error adding goal to Firebase:', firebaseError);
      }
      
      // If Firebase failed, try local database
      if (!goalSaved) {
        try {
          console.log('Attempting to add goal to local database...');
          const localGoalData = {
            ...goalData,
            userId: 1, // Local DB uses ID 1
            id: Date.now() // Generate a temporary ID
          };
          
          const localGoal = safeLocalDbCall('addGoal', localGoalData);
          
          if (localGoal) {
            console.log('Goal added to local database:', localGoal);
            addedGoalId = localGoal.id;
            goalSaved = true;
          } else {
            throw new Error('Failed to add goal to local database');
          }
        } catch (localError) {
          console.error('Error adding goal to local database:', localError);
        }
      }
      
      // If neither worked, try localStorage directly as last resort
      if (!goalSaved) {
        try {
          console.log('Attempting to add goal directly to localStorage...');
          const localStorageGoals = JSON.parse(localStorage.getItem('goals') || '[]');
          
          const newLocalGoal = {
            ...goalData,
            userId: 1,
            id: Date.now(),
            created_at: new Date().toISOString()
          };
          
          localStorageGoals.push(newLocalGoal);
          localStorage.setItem('goals', JSON.stringify(localStorageGoals));
          
          console.log('Goal added directly to localStorage:', newLocalGoal);
          addedGoalId = newLocalGoal.id;
          goalSaved = true;
        } catch (localStorageError) {
          console.error('Error adding goal directly to localStorage:', localStorageError);
        }
      }
      
      if (!goalSaved) {
        throw new Error('Failed to save goal to any available storage');
      }
      
      // Goal was saved successfully - clear the form
      setNewGoal({
        type: 'weight',
        target_value: '',
        current_value: '',
        deadline: '',
        reason: '',
        reasonDetail: ''
      });
      
      // Reload goals
      await loadGoals();
      
      // Show success message
      console.log('Goal created successfully!');
    } catch (error) {
      console.error('Error adding goal:', error);
      setError(`Failed to add goal: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!user || !editingGoal) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Edit form submitted with values:', editingGoal);
      
      // Validate inputs
      if (!editingGoal.current_value || !editingGoal.target_value) {
        throw new Error('Current and target values are required');
      }
      
      // Make sure we're converting the string values to numbers
      const goalData = {
        ...editingGoal,
        type: editingGoal.type,
        target_value: parseFloat(editingGoal.target_value) || 0,
        current_value: parseFloat(editingGoal.current_value) || 0,
        deadline: formatDateString(editingGoal.deadline), // Format the deadline properly
        reason: editingGoal.reason || '',
        reasonDetail: editingGoal.reasonDetail || ''
      };
      
      console.log('Prepared goal update data:', goalData);
      
      await dbService.updateGoal(editingGoal.id, goalData);
      
      // Clear editing state
      setEditingGoal(null);
      
      // Reload goals
      await loadGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      setError('Failed to update goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (goal) => {
    setEditingGoal(goal);
    // Scroll to the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingGoal(null);
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

  // Function to get the unit for a specific goal type
  const getUnitForGoalType = (type) => {
    const unitMap = {
      'weight': 'kg',
      'calories': 'kcal',
      'exercise': 'min'
    };
    return unitMap[type] || '';
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
      <h2 className="text-2xl font-bold mb-6 text-center bg-blue-100 p-3 rounded-lg shadow-sm">Health Goals</h2>

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

      {/* Add New Goal Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{editingGoal ? 'Edit Goal' : 'Add New Goal'}</h3>
          {!editingGoal && (
            <button
              type="button"
              onClick={generateSuggestion}
              className="flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-md transition-colors"
              disabled={suggestionLoading}
            >
              <Lightbulb size={18} />
              <span>Get AI Suggestion</span>
            </button>
          )}
        </div>
        
        {/* AI Suggestion Panel */}
        {showSuggestion && !editingGoal && (
          <div className="mb-6 bg-indigo-100 border border-indigo-200 rounded-md p-4 shadow-md">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-indigo-800 flex items-center gap-2">
                <Lightbulb size={18} /> 
                AI Suggestions
              </h4>
              <button 
                onClick={() => setShowSuggestion(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={18} />
              </button>
            </div>
            
            {suggestionLoading ? (
              <div className="py-4 text-center text-gray-700">
                <div className="animate-pulse mb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
                </div>
                Analyzing your profile and eating habits...
              </div>
            ) : suggestion ? (
              <div>
                {suggestionReasons.general && (
                  <div className="mb-4 p-3 bg-blue-100 rounded text-blue-800 text-sm">
                    {suggestionReasons.general}
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-2">Weight Loss Goal</h5>
                    <div className="mb-3">
                      <p className="text-sm mb-1"><span className="font-medium">Current:</span> {suggestion.weight.current} kg</p>
                      <p className="text-sm mb-1"><span className="font-medium">Target:</span> {suggestion.weight.target} kg</p>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar size={14} />
                        <span className="font-medium">By:</span> {new Date(suggestion.weight.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mb-3 text-xs text-gray-700 bg-gray-100 p-2 rounded">
                      <p className="mb-1">{suggestionReasons.weight?.reason}</p>
                      <p>{suggestionReasons.weight?.detail}</p>
                    </div>
                    <button
                      onClick={() => applySuggestion('weight')}
                      className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-2">Daily Calories</h5>
                    <div className="mb-3">
                      <p className="text-sm mb-1">
                        <span className="font-medium">Current:</span> {suggestion.calories.current} kcal/day
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-medium">Target:</span> {suggestion.calories.target} kcal/day
                      </p>
                      <p className="text-sm mb-1 text-gray-600">
                        <span className="font-medium">Weekly Total:</span> {suggestion.calories.target * 7} kcal/week
                      </p>
                      
                      <p className="text-sm flex items-center gap-1 mt-2">
                        <Calendar size={14} />
                        <span className="font-medium">By:</span> {new Date(suggestion.calories.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mb-3 text-xs text-gray-700 bg-gray-100 p-2 rounded">
                      <p className="mb-1">{suggestionReasons.calories?.reason}</p>
                      <p>{suggestionReasons.calories?.detail}</p>
                    </div>
                    <button
                      onClick={() => applySuggestion('calories')}
                      className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-2">Exercise Minutes</h5>
                    <div className="mb-3">
                      <p className="text-sm mb-1"><span className="font-medium">Current:</span> {suggestion.exercise.current} min</p>
                      <p className="text-sm mb-1"><span className="font-medium">Target:</span> {suggestion.exercise.target} min</p>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar size={14} />
                        <span className="font-medium">By:</span> {new Date(suggestion.exercise.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mb-3 text-xs text-gray-700 bg-gray-100 p-2 rounded">
                      <p className="mb-1">{suggestionReasons.exercise?.reason}</p>
                      <p>{suggestionReasons.exercise?.detail}</p>
                    </div>
                    <button
                      onClick={() => applySuggestion('exercise')}
                      className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="bg-red-50 p-4 rounded-md border border-red-100">
                  <h4 className="text-red-700 font-medium mb-2">Error Generating Suggestions</h4>
                  <p className="text-red-600 text-sm mb-3">
                    {error || "Could not generate suggestions. Please try again."}
                  </p>
                  <button
                    onClick={() => {
                      setError(null);
                      generateSuggestion();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded-md"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={editingGoal ? handleEditSubmit : handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
            <select
              value={editingGoal ? editingGoal.type : newGoal.type}
              onChange={(e) => editingGoal 
                ? setEditingGoal({...editingGoal, type: e.target.value}) 
                : setNewGoal({...newGoal, type: e.target.value})
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2"
              disabled={editingGoal !== null}
            >
              <option value="weight">Weight Loss (kg)</option>
              <option value="calories">Daily Calories (kcal)</option>
              <option value="exercise">Exercise Minutes (min)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
              <input
                type="number"
                value={editingGoal ? editingGoal.current_value : newGoal.current_value}
                onChange={(e) => editingGoal 
                  ? setEditingGoal({...editingGoal, current_value: e.target.value}) 
                  : setNewGoal({...newGoal, current_value: e.target.value})
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              {(editingGoal ? editingGoal.type : newGoal.type) === 'calories' && (
                <div className="text-xs text-gray-500 mt-1">
                  <p>Total calories consumed daily</p>
                  {(editingGoal ? editingGoal.current_value : newGoal.current_value) && (
                    <p className="mt-1">Weekly total: 
                      {Math.round((editingGoal ? editingGoal.current_value : newGoal.current_value) * 7)} kcal/week
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
              <input
                type="number"
                value={editingGoal ? editingGoal.target_value : newGoal.target_value}
                onChange={(e) => editingGoal 
                  ? setEditingGoal({...editingGoal, target_value: e.target.value}) 
                  : setNewGoal({...newGoal, target_value: e.target.value})
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              {(editingGoal ? editingGoal.type : newGoal.type) === 'calories' && (
                <div className="text-xs text-gray-500 mt-1">
                  <p>Your target daily calorie goal</p>
                  {(editingGoal ? editingGoal.target_value : newGoal.target_value) && (
                    <p className="mt-1">Weekly total: 
                      {Math.round((editingGoal ? editingGoal.target_value : newGoal.target_value) * 7)} kcal/week
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
            <input
              type="date"
              value={editingGoal ? editingGoal.deadline : newGoal.deadline}
              onChange={(e) => editingGoal 
                ? setEditingGoal({...editingGoal, deadline: e.target.value}) 
                : setNewGoal({...newGoal, deadline: e.target.value})
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="yyyy-mm-dd"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              {loading ? 'Saving...' : (
                <>
                  {editingGoal ? (
                    <>
                      <span>Update Goal</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>Add Goal</span>
                    </>
                  )}
                </>
              )}
            </button>
            
            {editingGoal && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Goals List */}
      <div>
        <h3 className="text-xl font-semibold mb-4 bg-blue-100 p-3 rounded-lg shadow-sm">Your Goals</h3>
        
        {loading ? (
          <div className="loading-spinner">Loading your goals...</div>
        ) : goals.length === 0 ? (
          <div className="no-goals">
            <p>You don't have any goals yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="goals-list">
            {goals.map(goal => (
              <div 
                key={goal.id} 
                className={`goal-card ${expandedGoalId === goal.id ? 'expanded' : ''}`}
              >
                <div className="goal-header" onClick={() => toggleGoalDetails(goal.id)}>
                  <div className="goal-title-row">
                    <h4>{mapGoalTypeToLabel(goal.type)}</h4>
                    <div className="goal-icons">
                      <button className="icon-button" onClick={(e) => { e.stopPropagation(); handleEdit(goal); }}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-button" onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }}>
                        <Trash2 size={16} />
                      </button>
                      {expandedGoalId === goal.id ? 
                        <ChevronUp size={16} /> : 
                        <ChevronDown size={16} />
                      }
                    </div>
                  </div>
                  
                  <div className="goal-progress-container">
                    <div 
                      className="goal-progress-bar"
                      style={{
                        width: `${Math.min(100, Math.max(0, (
                          goal.type === 'weight' && goal.current_value > goal.target_value
                            ? (1 - ((goal.current_value - goal.target_value) / (goal.current_value - goal.target_value + 0.1))) * 100
                            : (goal.current_value / goal.target_value) * 100
                        )))}%`
                      }}
                    />
                  </div>
                  
                  <div className="goal-summary">
                    <p>
                      Current: {goal.current_value} {getUnitForGoalType(goal.type)}
                      {' → '}
                      Target: {goal.target_value} {getUnitForGoalType(goal.type)}
                    </p>
                    
                    {goal.type === 'calories' && (
                      <p className="text-xs text-gray-600 mt-1">
                        Weekly total: {Math.round(goal.current_value * 7)} → {Math.round(goal.target_value * 7)} {getUnitForGoalType(goal.type)}/week
                      </p>
                    )}
                    
                    <p className="goal-deadline">
                      <Calendar size={14} className="icon" />
                      Deadline: {formatDateString(goal.deadline)}
                    </p>
                  </div>
                </div>
                
                {expandedGoalId === goal.id && (
                  <div className="goal-details">
                    {goal.reason && (
                      <div className="goal-reason">
                        <h5>Why This Goal?</h5>
                        <p>{goal.reason}</p>
                        {goal.reasonDetail && <p className="reason-detail">{goal.reasonDetail}</p>}
                      </div>
                    )}
                    
                    {goal.type === 'weight' && (
                      <div className="weight-tips">
                        <h5>Weight Loss Tips</h5>
                        <ul>
                          <li>Focus on whole foods and reduce processed food intake</li>
                          <li>Include plenty of protein and fiber in your diet</li>
                          <li>Stay hydrated throughout the day</li>
                          <li>Combine diet changes with regular exercise</li>
                        </ul>
                      </div>
                    )}
                    
                    {goal.type === 'calories' && (
                      <div className="calorie-tips">
                        <h5>Calorie Management Tips</h5>
                        <ul>
                          <li>Track your food intake consistently</li>
                          <li>Focus on nutrient-dense foods that keep you full longer</li>
                          <li>Be mindful of portion sizes</li>
                          <li>Daily target: {goal.target_value} calories per day</li>
                          <li>Weekly total: {Math.round(goal.target_value * 7)} calories per week</li>
                        </ul>
                      </div>
                    )}
                    
                    {goal.type === 'exercise' && (
                      <div className="exercise-tips">
                        <h5>Exercise Tips</h5>
                        <ul>
                          <li>Find activities you enjoy to stay motivated</li>
                          <li>Start with shorter sessions and gradually increase duration</li>
                          <li>Mix cardio, strength training, and flexibility exercises</li>
                          <li>Schedule your workouts like any other important appointment</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Goals;