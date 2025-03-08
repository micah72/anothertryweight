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
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare analysis data
      const analysisData = JSON.stringify({
        protein: editFormData.protein || '',
        carbs: editFormData.carbs || '',
        fat: editFormData.fat || '',
        benefits: editFormData.benefits || '',
        concerns: editFormData.concerns || '',
        nutritionSource: editFormData.nutritionSource || 'Estimated by AI',
        healthScoreReason: editFormData.healthScoreReason || 'Based on overall nutritional value',
        portionSize: editFormData.portionSize || 'Standard serving'
      });
      
      // Update food entry
      await dbService.updateFoodEntry(selectedFood.id, {
        foodName: editFormData.foodName,
        calories: editFormData.calories,
        healthScore: editFormData.healthScore,
        analysisData
      });
      
      // Close edit form and refresh data
      setIsEditing(false);
      
      // Update the selected food with new data
      setSelectedFood({
        ...selectedFood,
        foodName: editFormData.foodName,
        calories: editFormData.calories,
        healthScore: editFormData.healthScore,
        analysisData
      });
      
    } catch (error) {
      console.error('Error updating food entry:', error);
      setError('Failed to update food entry. Please try again.');
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
    <div className="w-full bg-gray-50 min-h-screen py-6">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Food Journal</h1>
          
          <button 
            onClick={handleAddPhoto}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
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
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">No Food Photos Yet</h3>
            <p className="text-gray-600 mb-6">Take pictures of your meals to start tracking your nutrition</p>
            <button 
              onClick={handleAddPhoto}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors duration-200"
            >
              Take Your First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {foodItems.map((food) => (
              <div 
                key={food.id} 
                onClick={() => handleFoodClick(food)}
                className="bg-white rounded-lg overflow-hidden shadow-md cursor-pointer transition-transform duration-300 hover:-translate-y-2"
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={food.imagePath}
                    alt={food.foodName} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{food.foodName}</h3>
                    <span className="text-sm text-blue-600 font-medium">{food.calories} cal</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {food.created_at ? formatDate(food.created_at) : 'Unknown date'}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Add Photo Card */}
            <div 
              onClick={handleAddPhoto}
              className="bg-white rounded-lg overflow-hidden shadow-md border-2 border-dashed border-gray-300 cursor-pointer transition-all duration-300 hover:border-blue-500 flex items-center justify-center h-64"
            >
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-gray-800 font-medium">Add New Food Photo</p>
                <p className="text-sm text-gray-500 mt-1">Capture your meal to track nutrition</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Food Detail Modal */}
      {selectedFood && !isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <img 
                src={selectedFood.imagePath} 
                alt={selectedFood.foodName}
                className="w-full h-48 object-cover" 
              />
              <button 
                onClick={handleCloseDetail}
                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900">{selectedFood.foodName}</h2>
                <div className="text-sm text-gray-500">
                  {selectedFood.created_at ? formatDate(selectedFood.created_at) : 'Unknown date'}
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{selectedFood.calories}</div>
                  <div className="text-xs text-gray-500">Calories</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{extractNutrients(selectedFood).protein}</div>
                  <div className="text-xs text-gray-500">Protein</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">{extractNutrients(selectedFood).carbs}</div>
                  <div className="text-xs text-gray-500">Carbs</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{extractNutrients(selectedFood).fat}</div>
                  <div className="text-xs text-gray-500">Fat</div>
                </div>
              </div>
              
              <div className="mb-4 text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-700 font-medium">Portion Size:</span>
                  <span className="text-gray-600">{extractNutrients(selectedFood).portionSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Nutrition Data Source:</span>
                  <span className="text-gray-600">{extractNutrients(selectedFood).nutritionSource}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Analysis</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="font-semibold text-gray-800">Health Score: {selectedFood.healthScore}/10</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {extractNutrients(selectedFood).healthScoreReason}
                  </p>
                  {selectedFood.analysisData && (
                    <>
                      <div className="mt-2">
                        <h5 className="text-sm font-medium text-gray-700">Benefits:</h5>
                        <p className="text-sm text-gray-600">
                          {JSON.parse(selectedFood.analysisData).benefits || 'No benefits information available'}
                        </p>
                      </div>
                      <div className="mt-2">
                        <h5 className="text-sm font-medium text-gray-700">Concerns:</h5>
                        <p className="text-sm text-gray-600">
                          {JSON.parse(selectedFood.analysisData).concerns || 'No concerns information available'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Delete Confirmation */}
              {deleteConfirm && (
                <div className="mt-4 bg-red-50 p-3 rounded-md border border-red-200">
                  <h4 className="font-semibold text-red-700 mb-2">Confirm Delete</h4>
                  <p className="text-sm text-red-600 mb-3">
                    Are you sure you want to delete "{selectedFood.foodName}"? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center text-sm"
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
                    <button
                      onClick={handleCancelDelete}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex justify-between">
                <div className="flex space-x-2">
                  <button 
                    onClick={handleEditClick}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={handleDeleteClick}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <button 
                  onClick={handleCloseDetail}
                  className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      {selectedFood && isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Food Entry</h2>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-200 rounded-full p-1.5 hover:bg-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmitEdit}>
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
                  
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
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
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodGallery; 