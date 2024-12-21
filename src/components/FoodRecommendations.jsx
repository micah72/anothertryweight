import React, { useState, useEffect } from 'react';
import { LineChart, TrendingUp, AlertCircle, ChefHat } from 'lucide-react'; // Changed 'Trend' to 'TrendingUp'
import dbService from '../db/database';
import LoadingSpinner from './LoadingSpinner';

const FoodRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMetrics, setUserMetrics] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const user = await dbService.getUser(1);
        const foodEntries = await dbService.getFoodEntries(1);
        setUserMetrics(user);
        
        const recs = calculateRecommendations(user, foodEntries);
        setRecommendations(recs);
      } catch (error) {
        console.error('Error loading recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Food Recommendations</h2>

      {/* Daily Calorie Target */}
      <div className="card-base mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Daily Calorie Target</h3>
            <p className="text-3xl font-bold text-primary mt-2">
              {(userMetrics?.daily_calories || 2000)} kcal
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-primary opacity-50" />
        </div>
      </div>

      {/* Meal Type Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-base">
          <h3 className="text-lg font-semibold mb-4">Recommended Meals</h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3">
                <ChefHat className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">{rec.name}</p>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                  <p className="text-sm text-gray-500">{rec.calories} kcal</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-base">
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

      {/* Weekly Meal Plan Suggestions */}
      <div className="card-base">
        <h3 className="text-lg font-semibold mb-4">Weekly Meal Plan Suggestions</h3>
        <div className="space-y-6">
          {/* Add meal plan suggestions here */}
        </div>
      </div>
    </div>
  );
};

// Helper function to generate recommendations
const calculateRecommendations = (metrics, foodHistory) => {
  // This would be more sophisticated in a real app
  return [
    {
      name: 'Grilled Chicken Salad',
      description: 'High in protein, low in calories, with mixed vegetables',
      calories: 350,
      nutritionalGaps: [
        {
          nutrient: 'Protein',
          recommendation: 'Include more lean proteins in your meals'
        },
        {
          nutrient: 'Fiber',
          recommendation: 'Add more whole grains and vegetables'
        }
      ]
    },
    {
      name: 'Quinoa Bowl',
      description: 'Rich in protein and fiber, with roasted vegetables',
      calories: 400
    },
    {
      name: 'Greek Yogurt Parfait',
      description: 'High protein breakfast with berries and honey',
      calories: 250
    }
  ];
};

export default FoodRecommendations;