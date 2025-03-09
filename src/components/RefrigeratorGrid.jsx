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
  const [expandedEntries, setExpandedEntries] = useState({});
  const [expandedRecipes, setExpandedRecipes] = useState({});
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

  const toggleExpandItems = (entryId) => {
    setExpandedEntries(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  const toggleExpandRecipes = (entryId) => {
    setExpandedRecipes(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white drop-shadow-sm pb-1">
            Refrigerator Analysis History
          </h2>
          <p className="text-white text-sm md:text-base opacity-90">Track your food inventory and get personalized recipe suggestions</p>
        </div>
        <Link 
          to="/scan" 
          className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Camera className="w-5 h-5 mr-2" />
          Scan Refrigerator
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {entries.length > 0 ? entries.map((entry) => {
          const analysisData = parseAnalysisData(entry.analysisData);
          console.log('Processing entry for display:', { id: entry.id, imagePath: entry.imagePath });

          return (
            <div key={entry.id} className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 relative transform hover:-translate-y-1">
              <div className="relative">
                {entry.imagePath ? (
                  <img
                    src={entry.imagePath}
                    alt="Refrigerator contents"
                    className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', entry.imagePath);
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                      e.target.alt = 'Image not available';
                    }}
                  />
                ) : (
                  <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute top-3 left-3 flex items-center bg-white/90 text-gray-700 rounded-full px-3 py-1 shadow-sm text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  {formatDate(entry.created_at)}
                </div>
                {analysisData.expiringItems?.length > 0 && (
                  <div className="absolute top-3 right-14 flex items-center bg-yellow-100 text-yellow-700 rounded-full px-3 py-1 shadow-sm text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-yellow-600" />
                    {analysisData.expiringItems.length} expiring
                  </div>
                )}
                <button
                  onClick={(e) => handleDeleteEntry(entry.id, e)}
                  className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200 shadow-sm"
                  title="Delete analysis"
                  aria-label="Delete analysis"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="p-5">
                {/* Items List */}
                {analysisData.items && analysisData.items.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
                      Available Items
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(expandedEntries[entry.id] ? analysisData.items : analysisData.items.slice(0, 6)).map((item, index) => (
                        <div
                          key={index}
                          className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full inline-flex flex-col border border-blue-100"
                        >
                          <div className="font-medium">
                            {typeof item === 'object' ? (item?.name || 'Unnamed item') : item}
                          </div>
                          {typeof item === 'object' && item?.quantity && (
                            <div className="text-xs text-blue-500 mt-0.5 text-center">
                              {item?.brand ? `${item.brand} · ` : ''}{item.quantity}
                            </div>
                          )}
                        </div>
                      ))}
                      {analysisData.items.length > 6 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandItems(entry.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 bg-white border border-blue-200 rounded-full hover:bg-blue-50 transition-colors duration-200"
                        >
                          {expandedEntries[entry.id] ? 'Show less' : `+${analysisData.items.length - 6} more`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Expiring Items */}
                {analysisData.expiringItems?.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-1.5 h-5 bg-yellow-500 rounded-full mr-2"></span>
                      Use Soon
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {analysisData.expiringItems.map((item, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-100 px-3 py-2 rounded-lg text-sm">
                          {typeof item === 'object' ? 
                            <>
                              <span className="font-medium text-yellow-800">{item?.name || 'Unnamed item'}</span>
                              {item?.daysUntilExpiry !== undefined && (
                                <div className="text-xs mt-1 flex items-center">
                                  <span className={`px-2 py-0.5 rounded-full ${item?.daysUntilExpiry <= 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {(item?.daysUntilExpiry <= 0) ? 'Expired!' : `${item?.daysUntilExpiry} days left`}
                                  </span>
                                </div>
                              )}
                            </> : 
                            <span className="font-medium text-yellow-800">{item}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Recipes */}
                {analysisData.suggestedRecipes?.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-1.5 h-5 bg-green-500 rounded-full mr-2"></span>
                      Suggested Recipes
                    </h3>
                    <div className="space-y-3">
                      {(expandedRecipes[entry.id] ? analysisData.suggestedRecipes : analysisData.suggestedRecipes.slice(0, 1)).map((recipe, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-100">
                          <p className="font-medium text-green-800 text-sm">{typeof recipe === 'object' ? (recipe?.name || 'Unnamed recipe') : recipe}</p>
                          {recipe?.description && (
                            <p className="text-xs text-green-600 mt-2 leading-relaxed">{recipe.description}</p>
                          )}
                        </div>
                      ))}
                      {analysisData.suggestedRecipes.length > 1 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandRecipes(entry.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 bg-white border border-blue-200 rounded-full hover:bg-blue-50 transition-colors duration-200"
                        >
                          {expandedRecipes[entry.id] ? 'Show fewer recipes' : `+${analysisData.suggestedRecipes.length - 1} more recipes`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }) : !error ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-8 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">No Refrigerator Analysis Yet</h3>
            <p className="text-gray-600 mb-6">Take a photo of your refrigerator contents to get started with smart inventory tracking</p>
            <Link 
              to="/scan" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg inline-flex items-center"
            >
              <Camera className="w-5 h-5 mr-2" />
              Scan Your Refrigerator
            </Link>
          </div>
        ) : null}
      </div>
      
      {error && (
        <div className="bg-white rounded-xl shadow-md p-8 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Error Loading Data</h3>
          <p className="text-gray-600 mb-6">{error.message || 'Failed to load refrigerator analyses'}</p>
          {error.details && <p className="text-sm text-gray-500 mb-6">{error.details}</p>}
          <button
            onClick={fetchEntries}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg inline-flex items-center"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default RefrigeratorGrid;