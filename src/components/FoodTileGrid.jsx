import React, { useState, useEffect } from 'react';
import dbService from '../db/database';

const FoodTileGrid = () => {
  const [foodEntries, setFoodEntries] = useState([]);

  useEffect(() => {
    loadFoodEntries();
  }, []);

  const loadFoodEntries = () => {
    try {
      const entries = dbService.getFoodEntries(1); // Using user ID 1
      setFoodEntries(entries || []);
    } catch (error) {
      console.error('Error loading food entries:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Food Journal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {foodEntries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={entry.imagePath}
                alt={entry.foodName || 'Food item'}
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{entry.foodName}</h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Calories: {entry.calories}
                </p>
                <p className="text-sm text-gray-600">
                  Health Score: {entry.healthScore}/10
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {foodEntries.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No food entries yet. Start by analyzing some food!
        </div>
      )}
    </div>
  );
};

export default FoodTileGrid;