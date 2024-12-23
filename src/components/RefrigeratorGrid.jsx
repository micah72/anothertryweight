import React, { useState, useEffect } from 'react';
import dbService from '../db/database';
import { Calendar, AlertCircle } from 'lucide-react';

const RefrigeratorGrid = () => {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = () => {
    try {
      const allEntries = dbService.getFoodEntries(1); // Using user ID 1
      const refrigeratorEntries = allEntries.filter(entry => entry.type === 'refrigerator');
      setEntries(refrigeratorEntries || []);
    } catch (error) {
      console.error('Error loading refrigerator entries:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Refrigerator Analysis History</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={entry.imagePath}
                alt="Refrigerator contents"
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(entry.created_at).toLocaleDateString()}
                </div>
                {entry.expiringItems?.length > 0 && (
                  <div className="flex items-center text-yellow-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">{entry.expiringItems.length} expiring</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Available Items:</h3>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(entry.analysisData).items.slice(0, 5).map((item, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {item}
                    </span>
                  ))}
                  {JSON.parse(entry.analysisData).items.length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{JSON.parse(entry.analysisData).items.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Suggested Recipes Preview */}
              {JSON.parse(entry.analysisData).suggestedRecipes?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700">Suggested Recipes:</h3>
                  <div className="text-sm text-gray-600">
                    {JSON.parse(entry.analysisData).suggestedRecipes[0].name}
                    {JSON.parse(entry.analysisData).suggestedRecipes.length > 1 && (
                      <span className="text-gray-500">
                        {' '}+{JSON.parse(entry.analysisData).suggestedRecipes.length - 1} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No refrigerator analyses yet. Start by analyzing your refrigerator contents!
        </div>
      )}
    </div>
  );
};

export default RefrigeratorGrid;