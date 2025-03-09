import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import dbService from '../firebase/dbService';
import LoadingSpinner from './LoadingSpinner';

const FoodGallery = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Set up real-time listener for food entries
    const unsubscribe = dbService.subscribeFoodEntries(
      user.uid,
      'food',
      (entries) => {
        setFoodItems(entries);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching food entries:', error);
        setError('Failed to load food entries. Please try again later.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleFoodClick = (food) => {
    setSelectedFood(food);
    setDeleteConfirm(false);
  };

  const handleCloseDetail = () => {
    setSelectedFood(null);
    setIsEditing(false);
    setDeleteConfirm(false);
  };

  const handleAddPhoto = () => {
    // Navigate to the analyze page instead of showing a modal
    navigate('/analyze');
  };

  // Format date from Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    // Handle both Firestore timestamps and JavaScript Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Extract macronutrients from analysis data if available
  const extractNutrients = (food) => {
    try {
      if (food.analysisData) {
        const analysis = JSON.parse(food.analysisData);
        return {
          protein: analysis.protein || 'N/A',
          carbs: analysis.carbs || 'N/A',
          fat: analysis.fat || 'N/A',
          nutritionSource: analysis.nutritionSource || 'Estimated by AI',
          healthScoreReason: analysis.healthScoreReason || 'Based on overall nutritional value',
          portionSize: analysis.portionSize || 'Standard serving'
        };
      }
    } catch (e) {
      console.error('Error parsing analysis data:', e);
    }
    
    return {
      protein: 'N/A',
      carbs: 'N/A',
      fat: 'N/A',
      nutritionSource: 'Estimated by AI',
      healthScoreReason: 'Based on overall nutritional value',
      portionSize: 'Standard serving'
    };
  };

  // Handle edit button click
  const handleEditClick = () => {
    // Initialize edit form with current food data
    setEditFormData({
      foodName: selectedFood.foodName,
      calories: selectedFood.calories,
      healthScore: selectedFood.healthScore,
      // Parse analysis data if it exists
      ...(() => {
        try {
          if (selectedFood.analysisData) {
            const analysis = JSON.parse(selectedFood.analysisData);
            return {
              protein: analysis.protein || '',
              carbs: analysis.carbs || '',
              fat: analysis.fat || '',
              benefits: analysis.benefits || '',
              concerns: analysis.concerns || '',
              nutritionSource: analysis.nutritionSource || 'Estimated by AI',
              healthScoreReason: analysis.healthScoreReason || 'Based on overall nutritional value',
              portionSize: analysis.portionSize || 'Standard serving'
            };
          }
          return {};
        } catch (e) {
          console.error('Error parsing analysis data for edit form:', e);
          return {};
        }
      })()
    });
    setIsEditing(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: name === 'calories' || name === 'healthScore' ? 
        (value === '' ? '' : Number(value)) : value
    });
  };

  // Handle form submission
  const handleSubmitEdit = async () => {
    try {
      setLoading(true);
      // Prepare the update data
      const updateData = {
        ...editFormData,
        // Parse analysisData from benefits and concerns
        analysisData: JSON.stringify({
          benefits: editFormData.benefits || '',
          concerns: editFormData.concerns || ''
        })
      };
      
      // Remove the individual benefits and concerns fields from the update
      delete updateData.benefits;
      delete updateData.concerns;
      
      // Update the food entry in Firestore
      await dbService.updateFoodEntry(selectedFood.id, updateData);
      
      // Close the edit modal and update the local state
      setIsEditing(false);
      setSelectedFood(prev => ({...prev, ...updateData}));
      
      console.log('Food entry updated successfully');
    } catch (error) {
      console.error('Error updating food entry:', error);
      // Show an error message to the user
      alert('Failed to update food entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    setDeleteConfirm(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await dbService.deleteFoodEntry(selectedFood.id);
      setSelectedFood(null);
      setDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting food entry:', error);
      setError('Failed to delete food entry. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirm(false);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-700">Please log in to view your food gallery.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen py-6 sm:py-8">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
          <div className="pl-1 sm:pl-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 pb-1 journal-title">
              My Food Journal
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm md:text-base mt-1 sm:mt-0.5 journal-subtitle">Track your meals and discover your nutrition patterns</p>
          </div>
          
          <button 
            onClick={handleAddPhoto}
            className="ml-1 sm:ml-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-5 py-2.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Food Photo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
            <p className="ml-2 text-gray-600">Loading your food entries...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : foodItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center max-w-md mx-auto mt-4 sm:mt-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-900">Your Food Journal Awaits</h3>
            <p className="text-gray-600 text-sm sm:text-base mb-6 sm:mb-8 mx-auto max-w-xs">Start by taking photos of your meals to track nutrition and build healthy habits</p>
            <button 
              onClick={handleAddPhoto}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 rounded-full text-sm sm:text-base font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Take Your First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4 md:gap-6 lg:gap-8 food-grid mt-2 sm:mt-0">
            {foodItems.map((food) => (
              <div 
                key={food.id} 
                onClick={() => handleFoodClick(food)}
                className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 food-card"
              >
                <div className="relative h-48 sm:h-52 md:h-56 overflow-hidden">
                  <img 
                    src={food.imagePath}
                    alt={food.foodName} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-3 right-3 bg-white bg-opacity-95 text-blue-600 font-semibold text-xs sm:text-sm px-2.5 py-1 sm:px-3 sm:py-1 rounded-full shadow-sm calorie-badge">
                    {food.calories} cal
                  </div>
                </div>
                <div className="p-3.5 sm:p-4">
                  <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-1.5 truncate food-name">{food.foodName}</h3>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500 food-date">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{food.created_at ? formatDate(food.created_at) : 'Unknown date'}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add Photo Card - Updated */}
            <div 
              onClick={handleAddPhoto}
              className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl overflow-hidden border-2 border-dashed border-blue-300 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-blue-500 flex items-center justify-center h-48 sm:h-52 md:h-72 food-card"
            >
              <div className="text-center p-5 sm:p-6 transform transition-transform duration-300 group-hover:scale-105">
                <div className="w-14 h-14 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center text-blue-600 mx-auto mb-3 sm:mb-4 group-hover:bg-blue-200 transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-6 sm:w-6 md:h-7 md:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-blue-800 font-medium text-base sm:text-lg mb-2">Add New Food Photo</p>
                <p className="text-blue-600 text-xs sm:text-sm">Capture your meal to track nutrition</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Food Detail Modal - Updated with modern design and improved spacing */}
      {selectedFood && !isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            {/* Image and header - non-scrollable */}
            <div className="relative flex-shrink-0">
              <img 
                src={selectedFood.imagePath} 
                alt={selectedFood.foodName}
                className="w-full h-48 sm:h-52 md:h-56 object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-4 w-full">
                <h2 className="text-lg sm:text-xl font-bold text-white">{selectedFood.foodName}</h2>
                <div className="flex items-center text-white/90 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{selectedFood.created_at ? formatDate(selectedFood.created_at) : 'Unknown date'}</span>
                </div>
              </div>
              <button 
                onClick={handleCloseDetail}
                className="absolute top-3 right-3 bg-white/15 backdrop-blur-sm text-white hover:bg-white/30 rounded-full p-1.5 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
                {/* Nutrition Overview Cards */}
                <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-3 sm:mb-5">
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center shadow-sm">
                    <div className="text-sm sm:text-lg font-bold text-blue-600">{selectedFood.calories}</div>
                    <div className="text-xxs sm:text-xs text-gray-600">Calories</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center shadow-sm">
                    <div className="text-sm sm:text-lg font-bold text-red-600">{extractNutrients(selectedFood).protein}</div>
                    <div className="text-xxs sm:text-xs text-gray-600">Protein</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center shadow-sm">
                    <div className="text-sm sm:text-lg font-bold text-yellow-600">{extractNutrients(selectedFood).carbs}</div>
                    <div className="text-xxs sm:text-xs text-gray-600">Carbs</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center shadow-sm">
                    <div className="text-sm sm:text-lg font-bold text-green-600">{extractNutrients(selectedFood).fat}</div>
                    <div className="text-xxs sm:text-xs text-gray-600">Fat</div>
                  </div>
                </div>
                
                {/* Food Details Section */}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Meal Details</h3>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium">Portion Size</span>
                      <span className="text-sm text-gray-600">{extractNutrients(selectedFood).portionSize}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium">Data Source</span>
                      <span className="text-sm text-gray-600">{extractNutrients(selectedFood).nutritionSource}</span>
                    </div>
                  </div>
                </div>
                
                {/* Health Analysis Section */}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Health Analysis</h3>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="rounded-md bg-blue-500 text-white font-bold py-1 px-2 text-sm mr-2 flex items-center">
                        <span>{selectedFood.healthScore}/10</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 text-sm">Health Score</h4>
                        <p className="text-xs text-blue-700">{extractNutrients(selectedFood).healthScoreReason}</p>
                      </div>
                    </div>
                    
                    {selectedFood.analysisData && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-white p-2 rounded-lg">
                          <h5 className="text-xs font-medium text-green-700 flex items-center mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Benefits
                          </h5>
                          <p className="text-xs text-gray-600">
                            {JSON.parse(selectedFood.analysisData).benefits || 'No benefits information available'}
                          </p>
                        </div>
                        <div className="bg-white p-2 rounded-lg">
                          <h5 className="text-xs font-medium text-red-700 flex items-center mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Concerns
                          </h5>
                          <p className="text-xs text-gray-600">
                            {JSON.parse(selectedFood.analysisData).concerns || 'No concerns information available'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Delete Confirmation - Updated */}
                {deleteConfirm && (
                  <div className="mt-3 bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-red-700 text-sm">Confirm Delete</h4>
                    </div>
                    <p className="text-xs text-red-600 mb-3">
                      Are you sure you want to delete "{selectedFood.foodName}"? This action cannot be undone.
                    </p>
                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={handleCancelDelete}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center text-xs font-medium"
                      >
                        {isDeleting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </>
                        ) : (
                          'Yes, Delete'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer buttons - non-scrollable */}
            <div className="flex justify-between px-3 sm:px-4 py-3 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleCloseDetail}
                className="flex items-center px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-200 text-xs font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={handleEditClick}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 text-xs font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all duration-200 text-xs font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      {selectedFood && isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header - non-scrollable */}
            <div className="p-4 flex-shrink-0 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Food Entry</h2>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-200 rounded-full p-1.5 hover:bg-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
              
            {/* Scrollable form area */}
            <div className="p-4 overflow-y-auto flex-grow">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="foodName" className="block text-sm font-medium text-gray-700 mb-1">
                    Food Name
                  </label>
                  <input
                    type="text"
                    id="foodName"
                    name="foodName"
                    value={editFormData.foodName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="calories" className="block text-sm font-medium text-gray-700 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      id="calories"
                      name="calories"
                      value={editFormData.calories || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="healthScore" className="block text-sm font-medium text-gray-700 mb-1">
                      Health Score (0-10)
                    </label>
                    <input
                      type="number"
                      id="healthScore"
                      name="healthScore"
                      value={editFormData.healthScore || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      min="0"
                      max="10"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="protein" className="block text-sm font-medium text-gray-700 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="text"
                      id="protein"
                      name="protein"
                      value={editFormData.protein || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="carbs" className="block text-sm font-medium text-gray-700 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="text"
                      id="carbs"
                      name="carbs"
                      value={editFormData.carbs || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="fat" className="block text-sm font-medium text-gray-700 mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="text"
                      id="fat"
                      name="fat"
                      value={editFormData.fat || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label htmlFor="portionSize" className="block text-sm font-medium text-gray-700 mb-1">
                      Portion Size
                    </label>
                    <input
                      type="text"
                      id="portionSize"
                      name="portionSize"
                      value={editFormData.portionSize || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., 100g, 1 cup"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="nutritionSource" className="block text-sm font-medium text-gray-700 mb-1">
                      Data Source
                    </label>
                    <input
                      type="text"
                      id="nutritionSource"
                      name="nutritionSource"
                      value={editFormData.nutritionSource || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., USDA, Package Label"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="healthScoreReason" className="block text-sm font-medium text-gray-700 mb-1">
                    Health Score Explanation
                  </label>
                  <textarea
                    id="healthScoreReason"
                    name="healthScoreReason"
                    value={editFormData.healthScoreReason || ''}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Brief explanation of the health score"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  ></textarea>
                </div>

                <div>
                  <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 mb-1">
                    Health Benefits
                  </label>
                  <textarea
                    id="benefits"
                    name="benefits"
                    value={editFormData.benefits || ''}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="concerns" className="block text-sm font-medium text-gray-700 mb-1">
                    Health Concerns
                  </label>
                  <textarea
                    id="concerns"
                    name="concerns"
                    value={editFormData.concerns || ''}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  ></textarea>
                </div>
              </div>
            </div>
                
            <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center text-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodGallery; 