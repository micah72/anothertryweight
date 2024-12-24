import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, ChefHat, Loader, RefreshCw } from 'lucide-react';
import OpenAIService from '../services/openaiService';
import dbService from '../firebase/dbService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const FoodRecommendations = () => {
  const [recommendations, setRecommendations] = useState({
    meals: [],
    nutritionalGaps: [],
    mealPlan: null
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userMetrics, setUserMetrics] = useState(null);
  const [refrigeratorItems, setRefrigeratorItems] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  const openaiService = new OpenAIService();

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load user profile
      const userProfile = await dbService.getUserProfile(user.uid);
      setUserMetrics(userProfile || {
        age: 30,
        weight: 70,
        height: 170,
        gender: 'not specified'
      });

      // Load recent refrigerator analysis
      const refrigeratorEntries = await dbService.getFoodEntries(user.uid, 'refrigerator', 1);
      if (refrigeratorEntries?.length > 0) {
        const latestRefrigeratorEntry = refrigeratorEntries[0];
        try {
          const analysisData = typeof latestRefrigeratorEntry.analysisData === 'string'
            ? JSON.parse(latestRefrigeratorEntry.analysisData)
            : latestRefrigeratorEntry.analysisData;

          setRefrigeratorItems(analysisData.items || []);
        } catch (error) {
          console.error('Error parsing refrigerator data:', error);
          setRefrigeratorItems([]);
        }
      }

      // Load recent food entries
      const foodEntries = await dbService.getFoodEntries(user.uid, 'food');
      
      // Generate initial recommendations
      await generateRecommendations(userProfile, foodEntries, refrigeratorItems);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load recommendations. Please try again.');
      // Set default recommendations
      setRecommendations({
        meals: [
          {
            name: 'Balanced Meal',
            description: 'A healthy combination of protein, vegetables, and grains',
            calories: 500,
            ingredients: ['protein', 'vegetables', 'grains']
          }
        ],
        nutritionalGaps: [
          {
            nutrient: 'General Nutrition',
            recommendation: 'Aim for balanced meals with protein, vegetables, and whole grains'
          }
        ],
        mealPlan: null
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async (profile, foodEntries, availableItems) => {
    try {
      setGenerating(true);
      setError(null);

      const context = {
        userProfile: {
          age: profile?.age || 30,
          weight: profile?.weight || 70,
          height: profile?.height || 170,
          targetWeight: profile?.target_weight || profile?.weight,
          gender: profile?.gender || 'not specified',
          dailyCalorieTarget: calculateDailyCalories(profile)
        },
        recentMeals: (foodEntries || []).slice(0, 5).map(entry => ({
          name: entry.foodName || 'Unknown Meal',
          calories: entry.calories || 0,
          healthScore: entry.healthScore || 0
        })),
        availableIngredients: availableItems || []
      };

      const result = await openaiService.generateFoodRecommendations(context);
      setRecommendations(result);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      setError('Failed to generate recommendations. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const calculateDailyCalories = (profile) => {
    if (!profile) return 2000;

    const weight = profile.weight || 70;
    const height = profile.height || 170;
    const age = profile.age || 30;

    // Harris-Benedict equation
    let bmr;
    if (profile.gender === 'female') {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    } else {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    }

    // Adjust for moderate activity
    return Math.round(bmr * 1.55);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-yellow-700">Please log in to view food recommendations.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading recommendations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Food Recommendations</h2>
        <button
          onClick={() => loadInitialData()}
          className="flex items-center space-x-2 text-primary hover:text-primary/80"
          disabled={generating}
        >
          <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Generating...' : 'Refresh'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Daily Calorie Target */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Daily Calorie Target</h3>
            <p className="text-3xl font-bold text-primary mt-2">
              {calculateDailyCalories(userMetrics)} kcal
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-primary opacity-50" />
        </div>
      </div>

      {/* Available Ingredients */}
      {refrigeratorItems.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Available Ingredients</h3>
          <div className="flex flex-wrap gap-2">
            {refrigeratorItems.map((item, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meal Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recommended Meals</h3>
            {generating && <Loader className="w-5 h-5 animate-spin" />}
          </div>
          <div className="space-y-4">
            {recommendations.meals?.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3">
                <ChefHat className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">{rec.name}</p>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                  <p className="text-sm text-gray-500">{rec.calories} kcal</p>
                  {rec.ingredients && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rec.ingredients.map((ingredient, idx) => (
                        <span
                          key={idx}
                          className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Nutritional Focus Areas</h3>
          <div className="space-y-4">
            {recommendations.nutritionalGaps?.map((gap, index) => (
              <div key={index} className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-1" />
                <div>
                  <p className="font-medium">{gap.nutrient}</p>
                  <p className="text-sm text-gray-600">{gap.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meal Plan Suggestions */}
      {recommendations.mealPlan && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Weekly Meal Plan Suggestions</h3>
          <div className="space-y-4">
            {Object.entries(recommendations.mealPlan).map(([day, meals]) => (
              <div key={day} className="border-b last:border-b-0 pb-4">
                <h4 className="font-medium text-gray-700 mb-2">{day}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {meals.map((meal, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">{meal.name}</p>
                      <p className="text-sm text-gray-600">{meal.calories} kcal</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodRecommendations;