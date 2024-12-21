import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X } from 'lucide-react';
import dbService from '../db/database';
import LoadingSpinner from './LoadingSpinner';

const MealPlanner = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: '',
    time: '12:00',
    calories: '',
    notes: ''
  });

  const mealTypes = [
    'Breakfast',
    'Morning Snack',
    'Lunch',
    'Afternoon Snack',
    'Dinner',
    'Evening Snack'
  ];

  const addMeal = async () => {
    try {
      setLoading(true);
      // Add meal to database
      await dbService.addMealPlan({
        userId: 1,
        ...newMeal,
        date: selectedDate.toISOString()
      });
      
      // Reset form and refresh meals
      setNewMeal({
        name: '',
        time: '12:00',
        calories: '',
        notes: ''
      });
      setShowAddMeal(false);
      loadMeals();
    } catch (error) {
      console.error('Error adding meal:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      const userMeals = await dbService.getMealPlans(1, selectedDate);
      setMeals(userMeals || []);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
  }, [selectedDate]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Meal Planner</h2>

      {/* Date Selection */}
      <div className="card-base mb-6">
        <div className="flex items-center justify-between">
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="input-base"
          />
          <button
            onClick={() => setShowAddMeal(true)}
            className="button-base flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Meal
          </button>
        </div>
      </div>

      {/* Meal List */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {mealTypes.map((mealType) => {
            const mealForType = meals.find(m => m.name === mealType);
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
                    <p className="text-sm mb-1">{mealForType.notes}</p>
                    <p className="text-sm text-gray-500">{mealForType.calories} calories</p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNewMeal(prev => ({ ...prev, name: mealType }));
                      setShowAddMeal(true);
                    }}
                    className="text-primary text-sm hover:underline"
                  >
                    + Plan this meal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Add Meal</h3>
              <button onClick={() => setShowAddMeal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
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

              <button
                onClick={addMeal}
                disabled={loading}
                className="button-base w-full"
              >
                {loading ? <LoadingSpinner /> : 'Save Meal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;