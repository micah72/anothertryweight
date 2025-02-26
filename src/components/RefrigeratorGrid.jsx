import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import dbService from '../firebase/dbService';
import { Calendar, AlertCircle, Trash2, RefreshCw, Camera } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { Link } from 'react-router-dom';

const RefrigeratorGrid = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAdmin, isApproved } = useAuth();

  const fetchEntries = async () => {
    if (!user) {
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    setError(null);

    try {
      // Subscribe to real-time updates specifically for refrigerator entries
      return dbService.subscribeFoodEntries(
        user.uid,
        'refrigerator',
        (newEntries) => {
          console.log('Received refrigerator entries:', newEntries);
          // Log each entry to debug image paths
          newEntries.forEach(entry => {
            console.log('Entry ID:', entry.id);
            console.log('Image path:', entry.imagePath);
            console.log('Analysis data:', entry.analysisData);
          });
          setEntries(newEntries);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error in refrigerator subscription:', err);
          if (err.code === 'permission-denied') {
            setError({
              message: 'You do not have permission to access this data.',
              details: 'This may be due to missing or invalid permissions in Firestore rules.',
              code: 'permission-denied'
            });
          } else {
            setError({
              message: 'Failed to load refrigerator analyses',
              details: err.message,
              code: err.code
            });
          }
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error initializing refrigerator entries:', error);
      setError({
        message: 'Failed to load refrigerator analyses',
        details: error.message,
        code: error.code
      });
      setLoading(false);
      return () => {};
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};

    unsubscribe = fetchEntries();

    // Cleanup subscription on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user]);

  const handleDeleteEntry = async (entryId, e) => {
    // Prevent event propagation to avoid navigation issues
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      try {
        await dbService.deleteFoodEntry(entryId);
      } catch (error) {
        console.error('Error deleting entry:', error);
        setError({
          message: 'Failed to delete analysis',
          details: error.message,
          code: error.code
        });
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
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <p className="text-sm text-yellow-700">Please log in to view your refrigerator analyses.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-6">Refrigerator Analysis History</h2>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div className="ml-3">
              <p className="text-sm text-red-700 font-bold">{error.message}</p>
              <p className="text-sm text-red-700 mt-1">{error.details}</p>
              
              {error.code === 'permission-denied' && (
                <div className="mt-3">
                  <p className="text-sm text-red-700">Possible solutions:</p>
                  <ul className="list-disc pl-5 text-sm mt-1 text-red-700">
                    <li>Make sure you are logged in with an approved account</li>
                    <li>Try refreshing the page</li>
                    <li>Contact the administrator for access</li>
                  </ul>
                </div>
              )}
              
              <button 
                onClick={fetchEntries}
                className="mt-3 flex items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering refrigerator grid with entries:', entries);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Refrigerator Analysis History</h2>
        <Link 
          to="/scan" 
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          <Camera className="w-5 h-5 mr-2" />
          Scan Refrigerator
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map((entry) => {
          const analysisData = parseAnalysisData(entry.analysisData);
          console.log('Processing entry for display:', { id: entry.id, imagePath: entry.imagePath });

          return (
            <div key={entry.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
              <div className="relative">
                {entry.imagePath ? (
                  <img
                    src={entry.imagePath}
                    alt="Refrigerator contents"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', entry.imagePath);
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                      e.target.alt = 'Image not available';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
                <button
                  onClick={(e) => handleDeleteEntry(entry.id, e)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                  title="Delete analysis"
                  aria-label="Delete analysis"
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

      {entries.length === 0 && !error && (
        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-md">
          <p className="text-lg mb-2">No refrigerator analyses yet.</p>
          <p className="text-sm mb-6">Start by analyzing your refrigerator contents!</p>
          <Link 
            to="/scan" 
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            <Camera className="w-5 h-5 mr-2" />
            Scan Refrigerator Now
          </Link>
        </div>
      )}
    </div>
  );
};

export default RefrigeratorGrid;