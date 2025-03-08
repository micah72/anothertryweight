import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, Sparkles, RefreshCw, Eye, Edit, Trash, Utensils, Tag } from 'lucide-react';
import dbService from '../firebase/dbService';
import OpenAIService from '../services/openaiService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const MealPlanner = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [refrigeratorItems, setRefrigeratorItems] = useState([]);
  const [pastMeals, setPastMeals] = useState([]);
  const [aiError, setAiError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [generatingAiSuggestions, setGeneratingAiSuggestions] = useState(false);
  // Track if we've already loaded suggestions for this session
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [tomorrowDate, setTomorrowDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const { user } = useAuth();
  const openaiService = new OpenAIService();
  
  const [newMeal, setNewMeal] = useState({
    id: null,
    name: '',
    time: '12:00',
    calories: '',
    notes: '',
    ingredients: [],
    recipe: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMealDetails, setViewMealDetails] = useState(null);
  const [showIngredientSuggestion, setShowIngredientSuggestion] = useState(false);
  const [suggestedIngredients, setSuggestedIngredients] = useState([]);
  const [ingredientInput, setIngredientInput] = useState('');
  const [selectedMealTypeForIngredients, setSelectedMealTypeForIngredients] = useState('');

  const mealTypes = [
    'Breakfast',
    'Morning Snack',
    'Lunch',
    'Afternoon Snack',
    'Dinner',
    'Evening Snack'
  ];

  const saveMeal = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      if (isEditMode && newMeal.id) {
        // Update existing meal
        await dbService.updateMealPlan(newMeal.id, {
          name: newMeal.name,
          time: newMeal.time,
          calories: newMeal.calories,
          notes: newMeal.notes,
          ingredients: newMeal.ingredients,
          recipe: newMeal.recipe
        });
      } else {
        // Add new meal to database
        await dbService.addMealPlan(user.uid, {
          ...newMeal,
          date: selectedDate
        });
      }
      
      // Reset form and refresh meals
      setNewMeal({
        id: null,
        name: '',
        time: '12:00',
        calories: '',
        notes: '',
        ingredients: [],
        recipe: ''
      });
      setIsEditMode(false);
      setShowAddMeal(false);
      loadMeals();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} meal:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  const editMeal = (meal) => {
    setNewMeal({
      id: meal.id,
      name: meal.name,
      time: meal.time || '12:00',
      calories: meal.calories?.toString() || '',
      notes: meal.notes || '',
      ingredients: meal.ingredients || [],
      recipe: meal.recipe || ''
    });
    setIsEditMode(true);
    setShowAddMeal(true);
  };
  
  const deleteMeal = async (mealId) => {
    if (!user || !mealId) return;
    
    try {
      setLoading(true);
      await dbService.deleteMealPlan(mealId);
      loadMeals();
    } catch (error) {
      console.error('Error deleting meal:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate AI meal suggestion
  const generateAIMealSuggestion = async (mealType) => {
    if (!user) return;
    if (refrigeratorItems.length === 0) {
      setAiError('No refrigerator items found. Please add items to your refrigerator first.');
      return;
    }
    
    try {
      setAiLoading(true);
      setAiError(null);
      
      // Default calorie targets by meal type
      const calorieTargets = {
        'Breakfast': 400,
        'Morning Snack': 200,
        'Lunch': 600,
        'Afternoon Snack': 200,
        'Dinner': 700,
        'Evening Snack': 200
      };
      
      const calorieTarget = calorieTargets[mealType] || 500;
      
      // Generate meal suggestion using OpenAI
      const suggestion = await openaiService.generateAIMealPlan(
        refrigeratorItems,
        pastMeals,
        mealType,
        calorieTarget
      );
      
      console.log('AI Meal Suggestion:', suggestion);
      
      if (suggestion && suggestion.error) {
        setAiError(suggestion.message || 'Failed to generate meal suggestion');
        return;
      }
      
      // Update the AI suggestions for the current date
      const dateKey = selectedDate.toISOString().split('T')[0];
      const updatedSuggestions = {
        ...aiSuggestions,
        [dateKey]: {
          ...(aiSuggestions[dateKey] || {}),
          [mealType]: suggestion
        }
      };
      
      setAiSuggestions(updatedSuggestions);
      
      // Save updated AI suggestions to database
      try {
        await dbService.saveAiMealSuggestions(user.uid, updatedSuggestions);
        console.log('Saved updated AI meal suggestion to database');
      } catch (error) {
        console.error('Error saving AI meal suggestion:', error);
      }
      
      // Update the new meal form with AI suggestion
      setNewMeal({
        id: null,
        name: mealType,
        time: suggestion.time || '12:00',
        calories: suggestion.calories?.toString() || '',
        notes: suggestion.description || suggestion.notes || '',
        ingredients: suggestion.ingredients || [],
        recipe: suggestion.recipe || ''
      });
      
      setIsEditMode(false);
      setShowAddMeal(true);
    } catch (error) {
      console.error('Error generating AI meal suggestion:', error);
      setAiError('Failed to generate meal suggestion: ' + (error.message || 'Unknown error'));
    } finally {
      setAiLoading(false);
    }
  };

  const loadMeals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setLoadError(null);
      const userMeals = await dbService.getMealPlans(user.uid, selectedDate);
      setMeals(userMeals || []);
    } catch (error) {
      console.error('Error loading meals:', error);
      setLoadError(`Error loading meals: ${error.message || 'Unknown error'}`);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load refrigerator items
  const loadRefrigeratorItems = async () => {
    if (!user) return;
    
    try {
      setLoadError(null);
      const entries = await dbService.getFoodEntries(user.uid, 'refrigerator', 1);
      if (entries && entries.length > 0) {
        const latestEntry = entries[0];
        const items = latestEntry.items || [];
        setRefrigeratorItems(items);
        console.log('Loaded refrigerator items:', items);
      } else {
        setRefrigeratorItems([]);
      }
    } catch (error) {
      console.error('Error loading refrigerator items:', error);
      setRefrigeratorItems([]);
      setLoadError(`Error loading refrigerator items: ${error.message || 'Unknown error'}`);
    }
  };
  
  // Load past meal choices
  const loadPastMeals = async () => {
    if (!user) return;
    
    try {
      // Get past meal plans from the last 7 days
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const pastMealPlans = await dbService.getFoodEntries(user.uid, 'food', 20);
      setPastMeals(pastMealPlans || []);
      console.log('Loaded past meals:', pastMealPlans);
    } catch (error) {
      console.error('Error loading past meals:', error);
      setPastMeals([]);
      setLoadError(`Error loading past meals: ${error.message || 'Unknown error'}`);
    }
  };
  
  // Generate AI meal suggestions for today and tomorrow
  const generateAiMealSuggestionsForDays = async () => {
    // Allow manual regeneration regardless of suggestionsLoaded state
    if (!user || refrigeratorItems.length === 0) return;
    
    try {
      setGeneratingAiSuggestions(true);
      setAiError(null);
      setLoadError(null);
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dates = [today, tomorrow];
      const newSuggestions = {};
      
      // Default calorie targets by meal type
      const calorieTargets = {
        'Breakfast': 400,
        'Morning Snack': 200,
        'Lunch': 600,
        'Afternoon Snack': 200,
        'Dinner': 700,
        'Evening Snack': 200
      };
      
      for (const date of dates) {
        const dateKey = date.toISOString().split('T')[0];
        newSuggestions[dateKey] = {};
        
        for (const mealType of mealTypes) {
          const calorieTarget = calorieTargets[mealType] || 500;
          
          try {
            const suggestion = await openaiService.generateAIMealPlan(
              refrigeratorItems,
              pastMeals,
              mealType,
              calorieTarget
            );
            
            if (suggestion && !suggestion.error) {
              newSuggestions[dateKey][mealType] = suggestion;
            } else {
              console.warn(`Received invalid suggestion for ${mealType}:`, suggestion);
              newSuggestions[dateKey][mealType] = null;
            }
          } catch (error) {
            console.error(`Error generating ${mealType} suggestion for ${dateKey}:`, error);
            newSuggestions[dateKey][mealType] = null;
          }
        }
      }
      
      setAiSuggestions(newSuggestions);
      console.log('Generated AI meal suggestions:', newSuggestions);
      
      // Save AI suggestions to database
      try {
        await dbService.saveAiMealSuggestions(user.uid, newSuggestions);
        console.log('Saved AI meal suggestions to database');
      } catch (error) {
        console.error('Error saving AI meal suggestions:', error);
      }
    } catch (error) {
      console.error('Error generating AI meal suggestions:', error);
      setAiError(`Error generating AI meal suggestions: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingAiSuggestions(false);
    }
  };
  
  // Apply a suggested meal to the form
  const applySuggestedMeal = (suggestion, mealType) => {
    if (!suggestion) return;
    
    setNewMeal({
      id: null,
      name: mealType,
      time: suggestion.time || '12:00',
      calories: suggestion.calories?.toString() || '',
      notes: suggestion.description || suggestion.notes || '',
      ingredients: suggestion.ingredients || [],
      recipe: suggestion.recipe || ''
    });
    
    setIsEditMode(false);
    setShowAddMeal(true);
  };
  
  // View meal details
  const viewMeal = (meal) => {
    setViewMealDetails(meal);
  };
  
  // Generate meal with suggested ingredients
  const generateMealWithIngredients = async () => {
    if (!user || refrigeratorItems.length === 0 || suggestedIngredients.length === 0 || !selectedMealTypeForIngredients) {
      setAiError('Please select a meal type and add at least one ingredient suggestion.');
      return;
    }
    
    try {
      setAiLoading(true);
      setAiError(null);
      
      // Default calorie targets by meal type
      const calorieTargets = {
        'Breakfast': 400,
        'Morning Snack': 200,
        'Lunch': 600,
        'Afternoon Snack': 200,
        'Dinner': 700,
        'Evening Snack': 200
      };
      
      const calorieTarget = calorieTargets[selectedMealTypeForIngredients] || 500;
      
      // Generate meal suggestion using OpenAI with specific ingredients
      const suggestion = await openaiService.generateMealWithIngredients(
        refrigeratorItems,
        suggestedIngredients,
        selectedMealTypeForIngredients,
        calorieTarget
      );
      
      console.log('AI Meal Suggestion with Ingredients:', suggestion);
      
      if (suggestion && suggestion.error) {
        setAiError(suggestion.message || 'Failed to generate meal suggestion');
        return;
      }
      
      // Update the AI suggestions for the current date
      const dateKey = selectedDate.toISOString().split('T')[0];
      const updatedSuggestions = {
        ...aiSuggestions,
        [dateKey]: {
          ...(aiSuggestions[dateKey] || {}),
          [selectedMealTypeForIngredients]: suggestion
        }
      };
      
      setAiSuggestions(updatedSuggestions);
      
      // Save updated AI suggestions to database
      try {
        await dbService.saveAiMealSuggestions(user.uid, updatedSuggestions);
        console.log('Saved updated AI meal suggestion with ingredients to database');
      } catch (error) {
        console.error('Error saving AI meal suggestion with ingredients:', error);
      }
      
      // Update the new meal form with AI suggestion
      setNewMeal({
        id: null,
        name: selectedMealTypeForIngredients,
        time: suggestion.time || '12:00',
        calories: suggestion.calories?.toString() || '',
        notes: suggestion.description || suggestion.notes || '',
        ingredients: suggestion.ingredients || [],
        recipe: suggestion.recipe || ''
      });
      
      // Reset ingredient suggestion state
      setShowIngredientSuggestion(false);
      setSuggestedIngredients([]);
      setIngredientInput('');
      setSelectedMealTypeForIngredients('');
      
      setIsEditMode(false);
      setShowAddMeal(true);
    } catch (error) {
      console.error('Error generating AI meal suggestion with ingredients:', error);
      setAiError('Failed to generate meal suggestion: ' + (error.message || 'Unknown error'));
    } finally {
      setAiLoading(false);
    }
  };
  
  // Add ingredient to suggestion list
  const addIngredientSuggestion = () => {
    if (ingredientInput.trim() === '') return;
    
    setSuggestedIngredients(prev => [...prev, ingredientInput.trim()]);
    setIngredientInput('');
  };
  
  // Remove ingredient from suggestion list
  const removeIngredientSuggestion = (index) => {
    setSuggestedIngredients(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    loadMeals();
  }, [selectedDate, user]);
  
  // Load AI suggestions from database
  const loadAiSuggestions = async () => {
    if (!user) return;
    
    try {
      setLoadError(null);
      setGeneratingAiSuggestions(true);
      
      const savedSuggestions = await dbService.getAiMealSuggestions(user.uid);
      if (savedSuggestions && Object.keys(savedSuggestions).length > 0) {
        setAiSuggestions(savedSuggestions);
        setSuggestionsLoaded(true); // Mark suggestions as loaded
        console.log('Loaded AI meal suggestions from database:', savedSuggestions);
      } else {
        console.log('No saved AI meal suggestions found in database');
        // Don't mark as loaded - will trigger generation if needed
      }
    } catch (error) {
      console.error('Error loading AI meal suggestions:', error);
      setLoadError(`Error loading AI meal suggestions: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingAiSuggestions(false);
    }
  };
  
  useEffect(() => {
    loadRefrigeratorItems();
    loadPastMeals();
    loadAiSuggestions();
  }, [user]);
  
  // Manual refresh button handler
  const handleRefreshSuggestions = () => {
    if (user && refrigeratorItems.length > 0) {
      generateAiMealSuggestionsForDays();
    }
  };
  
  // Generate AI meal suggestions for today and tomorrow only if we don't have saved suggestions
  // and only when explicitly requested via button click
  // We no longer auto-generate suggestions when loading the page

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Meal Planner</h2>

      {/* Date Selection and AI Controls */}
      <div className="card-base mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="input-base"
            />
            <select 
              className="input-base"
              onChange={(e) => {
                if (e.target.value === 'today') {
                  setSelectedDate(new Date());
                } else if (e.target.value === 'tomorrow') {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow);
                }
              }}
            >
              <option value="">Quick Select</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefreshSuggestions}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded flex items-center text-sm"
              disabled={generatingAiSuggestions || refrigeratorItems.length === 0}
            >
              {generatingAiSuggestions ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-1">Generating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh AI Suggestions
                </>
              )}
            </button>
            <button
              onClick={() => setShowIngredientSuggestion(true)}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-3 rounded flex items-center text-sm"
              disabled={generatingAiSuggestions || refrigeratorItems.length === 0}
            >
              <Utensils className="w-4 h-4 mr-1" />
              Suggest Ingredients
            </button>
            <button
              onClick={() => setShowAddMeal(true)}
              className="button-base flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Meal
            </button>
          </div>
        </div>
        
        {refrigeratorItems.length === 0 && (
          <div className="mt-3 p-3 border border-yellow-300 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700">
              No refrigerator items found. For AI meal suggestions based on your available ingredients, 
              please add items to your refrigerator by using the Refrigerator Analysis feature.
            </p>
          </div>
        )}
        
        {(aiError || loadError) && (
          <div className="mt-3 p-3 border-l-4 border-red-500 bg-red-50 rounded-md">
            <p className="text-sm text-red-700">{aiError || loadError}</p>
          </div>
        )}
      </div>

      {/* Date Tabs */}
      <div className="flex mb-4 border-b">
        <button
          className={`py-2 px-4 font-medium ${selectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0] ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => {
            const today = new Date();
            setSelectedDate(today);
          }}
        >
          Today
        </button>
        <button
          className={`py-2 px-4 font-medium ${selectedDate.toISOString().split('T')[0] === tomorrowDate.toISOString().split('T')[0] ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow);
          }}
        >
          Tomorrow
        </button>
      </div>
      
      {/* Meal List */}
      {loading ? (
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="mt-2 text-gray-600">Loading meals...</p>
        </div>
      ) : generatingAiSuggestions ? (
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="mt-2 text-gray-600">Generating AI meal suggestions...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a moment as we craft personalized meals based on your refrigerator contents.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mealTypes.map((mealType) => {
            const mealForType = meals.find(m => m.name === mealType);
            const dateKey = selectedDate.toISOString().split('T')[0];
            const aiSuggestion = aiSuggestions[dateKey]?.[mealType];
            
            return (
              <div key={mealType} className="card-base">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{mealType}</h3>
                  {mealForType && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {mealForType.time}
                    </div>
                  )}
                </div>
                
                {mealForType ? (
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm mb-1">{mealForType.notes}</p>
                        <p className="text-sm text-gray-500">{mealForType.calories} calories</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => viewMeal(mealForType)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1 px-2 rounded"
                          title="View details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => editMeal(mealForType)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium py-1 px-2 rounded"
                          title="Edit meal"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteMeal(mealForType.id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-1 px-2 rounded"
                          title="Delete meal"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : aiSuggestion ? (
                  <div className="border-l-4 border-purple-300 pl-3 py-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{aiSuggestion.name}</p>
                        <p className="text-xs text-gray-600 mb-1">{aiSuggestion.description}</p>
                        <div className="flex space-x-3 text-xs text-gray-500">
                          <span>{aiSuggestion.calories} cal</span>
                          <span>{aiSuggestion.protein}g protein</span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => applySuggestedMeal(aiSuggestion, mealType)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-1 px-2 rounded"
                        >
                          View & Edit
                        </button>
                        <button
                          onClick={() => generateAIMealSuggestion(mealType)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs py-1 px-2 rounded"
                          disabled={aiLoading}
                        >
                          {aiLoading && mealType === newMeal.name ? (
                            <span className="flex items-center justify-center">
                              <LoadingSpinner size="xs" />
                            </span>
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setNewMeal(prev => ({ ...prev, name: mealType }));
                        setShowAddMeal(true);
                      }}
                      className="text-primary text-sm hover:underline"
                    >
                      + Plan this meal
                    </button>
                    <button
                      onClick={() => generateAIMealSuggestion(mealType)}
                      className="text-purple-600 text-sm hover:underline flex items-center"
                      disabled={aiLoading}
                    >
                      {aiLoading && mealType === newMeal.name ? (
                        <span className="flex items-center justify-center">
                          <LoadingSpinner size="sm" />
                        </span>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Suggest
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{isEditMode ? 'Edit Meal' : 'Add Meal'}</h3>
              <button onClick={() => {
                setShowAddMeal(false);
                setIsEditMode(false);
                setNewMeal({
                  id: null,
                  name: '',
                  time: '12:00',
                  calories: '',
                  notes: '',
                  ingredients: [],
                  recipe: ''
                });
              }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {aiError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <p className="text-red-700">{aiError}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Meal Type</label>
                <select
                  value={newMeal.name}
                  onChange={(e) => setNewMeal(prev => ({ ...prev, name: e.target.value }))}
                  className="input-base"
                >
                  <option value="">Select meal type</option>
                  {mealTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input
                  type="time"
                  value={newMeal.time}
                  onChange={(e) => setNewMeal(prev => ({ ...prev, time: e.target.value }))}
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Calories</label>
                <input
                  type="number"
                  value={newMeal.calories}
                  onChange={(e) => setNewMeal(prev => ({ ...prev, calories: e.target.value }))}
                  className="input-base"
                  placeholder="Enter calories"
                />
              </div>
              
              {/* AI-generated ingredients */}
              {newMeal.ingredients && newMeal.ingredients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ingredients</label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <ul className="list-disc pl-5 space-y-1">
                      {newMeal.ingredients.map((ingredient, index) => (
                        <li key={index} className="text-sm">{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* AI-generated recipe */}
              {newMeal.recipe && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipe</label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm whitespace-pre-line">{newMeal.recipe}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-base"
                  rows="3"
                  placeholder="Add meal notes..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={saveMeal}
                  disabled={loading}
                  className="button-base w-full"
                >
                  {loading ? <span className="flex items-center justify-center"><LoadingSpinner /></span> : isEditMode ? 'Update Meal' : 'Save Meal'}
                </button>
                
                {newMeal.name && (
                  <button
                    onClick={() => generateAIMealSuggestion(newMeal.name)}
                    disabled={aiLoading}
                    className="button-base-secondary flex items-center justify-center"
                    title="Regenerate AI suggestion"
                  >
                    {aiLoading ? <LoadingSpinner /> : <RefreshCw className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* View Meal Details Modal */}
      {viewMealDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{viewMealDetails.name}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    editMeal(viewMealDetails);
                    setViewMealDetails(null);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-1 px-3 rounded flex items-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button onClick={() => setViewMealDetails(null)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center text-gray-500 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                <span>{viewMealDetails.time}</span>
                <span className="mx-3">•</span>
                <span>{viewMealDetails.calories} calories</span>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-gray-700">{viewMealDetails.notes}</p>
              </div>
              
              {viewMealDetails.ingredients && viewMealDetails.ingredients.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Ingredients</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {viewMealDetails.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-sm">{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {viewMealDetails.recipe && (
                <div>
                  <h4 className="font-medium mb-1">Recipe</h4>
                  <p className="text-sm whitespace-pre-line">{viewMealDetails.recipe}</p>
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewMealDetails(null)}
                  className="button-base-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Ingredient Suggestion Modal */}
      {showIngredientSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Suggest Ingredients for a Meal</h3>
              <button onClick={() => {
                setShowIngredientSuggestion(false);
                setSuggestedIngredients([]);
                setIngredientInput('');
                setSelectedMealTypeForIngredients('');
              }}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Meal Type</label>
                <select
                  value={selectedMealTypeForIngredients}
                  onChange={(e) => setSelectedMealTypeForIngredients(e.target.value)}
                  className="input-base w-full"
                >
                  <option value="">Select a meal type</option>
                  {mealTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Ingredients You'd Like to Use</label>
                <div className="flex">
                  <input
                    type="text"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addIngredientSuggestion()}
                    className="input-base flex-grow"
                    placeholder="Enter an ingredient..."
                  />
                  <button
                    onClick={addIngredientSuggestion}
                    className="button-base ml-2"
                    disabled={!ingredientInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {suggestedIngredients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suggested Ingredients:</label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedIngredients.map((ingredient, index) => (
                      <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                        <Tag className="w-3 h-3 mr-1" />
                        <span className="text-sm">{ingredient}</span>
                        <button
                          onClick={() => removeIngredientSuggestion(index)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-700">
                <p>The AI will create a recipe using your suggested ingredients along with other items from your refrigerator.</p>
              </div>
              
              {aiError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                  <p className="text-red-700">{aiError}</p>
                </div>
              )}
              
              <div className="flex justify-end pt-4 space-x-3">
                <button
                  onClick={() => {
                    setShowIngredientSuggestion(false);
                    setSuggestedIngredients([]);
                    setIngredientInput('');
                    setSelectedMealTypeForIngredients('');
                  }}
                  className="button-base-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={generateMealWithIngredients}
                  disabled={aiLoading || suggestedIngredients.length === 0 || !selectedMealTypeForIngredients}
                  className="button-base flex items-center justify-center"
                >
                  {aiLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Generating...</span>
                    </span>
                  ) : (
                    <>
                      <Utensils className="w-4 h-4 mr-2" />
                      Generate Recipe
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;