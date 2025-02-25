import React, { useState } from 'react';

const FoodGallery = () => {
  const [foodItems, setFoodItems] = useState([
    // Sample data - in a real app, this would come from a database
    {
      id: 1,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      name: 'Breakfast Bowl',
      calories: 450,
      protein: '22g',
      carbs: '48g',
      fat: '18g',
      date: '2023-04-15',
      mealTime: 'Breakfast'
    },
    {
      id: 2,
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      name: 'Steak Dinner',
      calories: 650,
      protein: '45g',
      carbs: '30g',
      fat: '35g',
      date: '2023-04-14',
      mealTime: 'Dinner'
    },
    {
      id: 3,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      name: 'Healthy Salad',
      calories: 320,
      protein: '12g',
      carbs: '45g',
      fat: '12g',
      date: '2023-04-14',
      mealTime: 'Lunch'
    }
  ]);

  const [selectedFood, setSelectedFood] = useState(null);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);

  const handleFoodClick = (food) => {
    setSelectedFood(food);
  };

  const handleCloseDetail = () => {
    setSelectedFood(null);
  };

  const handleAddPhoto = () => {
    setShowAddPhotoModal(true);
  };

  const handleCloseModal = () => {
    setShowAddPhotoModal(false);
  };

  // In a real app, this would connect to the camera and upload functionality
  const handleCapturePhoto = () => {
    alert('In a real app, this would open your camera to take a photo of your food.');
    setShowAddPhotoModal(false);
  };

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

        {foodItems.length === 0 ? (
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
                    src={food.imageUrl}
                    alt={food.name} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{food.name}</h3>
                    <span className="text-sm text-blue-600 font-medium">{food.calories} cal</span>
                  </div>
                  <p className="text-sm text-gray-500">{food.date} • {food.mealTime}</p>
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
      {selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <img 
                src={selectedFood.imageUrl} 
                alt={selectedFood.name}
                className="w-full h-64 object-cover" 
              />
              <button 
                onClick={handleCloseDetail}
                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedFood.name}</h2>
                <div className="text-sm text-gray-500">{selectedFood.date} • {selectedFood.mealTime}</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{selectedFood.calories}</div>
                  <div className="text-xs text-gray-500">Calories</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{selectedFood.protein}</div>
                  <div className="text-xs text-gray-500">Protein</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{selectedFood.carbs}</div>
                  <div className="text-xs text-gray-500">Carbs</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{selectedFood.fat}</div>
                  <div className="text-xs text-gray-500">Fat</div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Analysis</h3>
                <p className="text-gray-600 mb-4">
                  This meal is {selectedFood.calories > 500 ? 'higher in calories' : 'moderate in calories'} and 
                  {selectedFood.protein.replace('g', '') > 20 ? ' rich in protein' : ' contains some protein'}.
                </p>
                <div className="analysis-result score-high p-4 rounded-md">
                  <h4 className="font-semibold text-green-800">Nutritional Quality</h4>
                  <p className="text-green-700">Good balance of macronutrients with adequate protein.</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleCloseDetail}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Food Photo</h2>
              <p className="text-gray-600 mb-6">Take a photo of your meal to track your nutrition</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center h-48 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 text-center">Click to take a photo or upload from your device</p>
              </div>
              
              <div className="flex justify-between">
                <button 
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCapturePhoto}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Take Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodGallery; 