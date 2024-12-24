import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import dbService from '../firebase/dbService';
import { Calendar, AlertCircle, Trash2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const RefrigeratorGrid = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribe = () => {};

    const initializeEntries = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Subscribe to real-time updates specifically for refrigerator entries
        unsubscribe = dbService.subscribeFoodEntries(
          user.uid,
          'refrigerator',
          (newEntries) => {
            console.log('Received refrigerator entries:', newEntries);
            setEntries(newEntries);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error initializing refrigerator entries:', error);
        setError('Failed to load refrigerator analyses');
        setLoading(false);
      }
    };

    initializeEntries();

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user]);

  const handleDeleteEntry = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      try {
        await dbService.deleteFoodEntry(entryId);
      } catch (error) {
        console.error('Error deleting entry:', error);
        setError('Failed to delete analysis');
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recent';
    
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const parseAnalysisData = (data) => {
    if (!data) return {};
    
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      console.error('Error parsing analysis data:', error);
      return {};
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-6">Refrigerator Analysis History</h2>
        <div className="text-center py-10">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading analyses...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center text-gray-500 py-10">
          Please log in to view your refrigerator analyses.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Refrigerator Analysis History</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map((entry) => {
          const analysisData = parseAnalysisData(entry.analysisData);
          console.log('Processing entry:', { id: entry.id, analysisData });

          return (
            <div key={entry.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="aspect-w-16 aspect-h-9 relative group">
                <img
                  src={entry.imagePath}
                  alt="Refrigerator contents"
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="Delete analysis"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(entry.created_at)}
                  </div>
                  {analysisData.expiringItems?.length > 0 && (
                    <div className="flex items-center text-yellow-500">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">{analysisData.expiringItems.length} expiring</span>
                    </div>
                  )}
                </div>

                {/* Items List */}
                {analysisData.items && analysisData.items.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Available Items:</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.items.slice(0, 5).map((item, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {item}
                        </span>
                      ))}
                      {analysisData.items.length > 5 && (
                        <span className="text-xs text-gray-500">
                          +{analysisData.items.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Expiring Items */}
                {analysisData.expiringItems?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700">Use Soon:</h3>
                    <div className="mt-2 space-y-1">
                      {analysisData.expiringItems.map((item, index) => (
                        <div key={index} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Recipes */}
                {analysisData.suggestedRecipes?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700">Suggested Recipes:</h3>
                    <div className="mt-2">
                      {analysisData.suggestedRecipes.slice(0, 1).map((recipe, index) => (
                        <div key={index} className="bg-green-50 p-2 rounded text-sm">
                          <p className="font-medium text-green-800">{recipe.name}</p>
                          {recipe.description && (
                            <p className="text-xs text-green-600 mt-1">{recipe.description}</p>
                          )}
                        </div>
                      ))}
                      {analysisData.suggestedRecipes.length > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          +{analysisData.suggestedRecipes.length - 1} more recipes
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-md">
          <p className="text-lg mb-2">No refrigerator analyses yet.</p>
          <p className="text-sm">Start by analyzing your refrigerator contents!</p>
        </div>
      )}
    </div>
  );
};

export default RefrigeratorGrid;