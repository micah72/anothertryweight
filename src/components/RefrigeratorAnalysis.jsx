import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Upload, X, AlertCircle } from 'lucide-react';
import OpenAIService from '../services/openaiService';
import dbService from '../firebase/dbService';
import LoadingSpinner from './LoadingSpinner';
import CameraComponent from './Camera';
import { useNavigate } from 'react-router-dom';

const ErrorAlert = ({ children }) => (
  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded">
    <div className="flex">
      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
      <div className="ml-3">
        <p className="text-sm text-red-700">{children}</p>
      </div>
    </div>
  </div>
);

const compressImage = async (imageData) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // More aggressive compression for large images
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 600;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Use a lower quality setting for better compression
      const quality = 0.5;
      const compressedImage = canvas.toDataURL('image/jpeg', quality);
      
      console.log('Original image size (chars):', imageData.length);
      console.log('Compressed image size (chars):', compressedImage.length);
      
      resolve(compressedImage);
    };
    img.src = imageData;
  });
};

// Function to ensure image data isn't too large for storage
const prepareImageForStorage = (imageData) => {
  // If the image data is too large, we might need to store it differently
  // For now, we'll just ensure it's a data URL
  if (!imageData.startsWith('data:')) {
    return `data:image/jpeg;base64,${imageData}`;
  }
  return imageData;
};

const RefrigeratorAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const openaiService = new OpenAIService();

  const handleImageUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const compressed = await compressImage(e.target.result);
          setSelectedImage(compressed);
          setAnalysis(null);
          setError(null);
        } catch (err) {
          setError('Failed to process image');
        }
      };
      reader.onerror = () => setError('Failed to read image file');
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Failed to process image');
    }
  }, []);

  const handleCameraCapture = async (imageData) => {
    try {
      const compressed = await compressImage(imageData);
      setSelectedImage(compressed);
      setShowCamera(false);
      setAnalysis(null);
      setError(null);
    } catch (error) {
      console.error('Error processing camera image:', error);
      setError('Failed to process camera image');
      setShowCamera(false);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    if (!user) {
      setError('Please log in to analyze your refrigerator');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Make sure we're sending the image in the correct format
      const imageToSend = selectedImage.startsWith('data:') 
        ? selectedImage 
        : `data:image/jpeg;base64,${selectedImage}`;
      
      console.log('Analyzing refrigerator image...');
      console.log('Image format check - starts with data:image:', selectedImage.startsWith('data:image'));

      const result = await openaiService.analyzeRefrigeratorImage(imageToSend);

      if (result.error) {
        throw new Error('Failed to analyze refrigerator content');
      }

      // Process items to ensure they have the correct structure
      const processedItems = Array.isArray(result.items) 
        ? result.items.map(item => {
            // Handle case where item might be a string instead of an object
            if (typeof item === 'string') {
              return { name: item, category: 'Uncategorized' };
            }
            return item || { name: 'Unknown Item', category: 'Uncategorized' };
          })
        : [];

      // Process expiring items
      const processedExpiringItems = Array.isArray(result.expiringItems)
        ? result.expiringItems.map(item => {
            // Handle case where item might be a string instead of an object
            if (typeof item === 'string') {
              return { name: item };
            }
            return item || { name: 'Unknown Item' };
          })
        : [];

      // Create a properly structured entry object
      const entry = {
        type: 'refrigerator',
        imagePath: prepareImageForStorage(selectedImage),
        items: processedItems,
        expiringItems: processedExpiringItems,
        suggestedRecipes: result.suggestedRecipes || [],
        inventorySummary: result.inventorySummary || {},
        foodGroups: result.foodGroups || {},
        shoppingRecommendations: result.shoppingRecommendations || [],
        analysisData: JSON.stringify(result),
        created_at: new Date(),
        // Add required fields that were missing before
        foodName: 'Refrigerator Analysis',
        calories: 0,
        healthScore: 0
      };

      console.log('Saving entry to database with image path:', entry.imagePath);
      console.log('Image path length:', entry.imagePath.length);
      
      // Save to database with the complete entry object
      try {
        const entryId = await dbService.addFoodEntry(user.uid, entry);
        console.log('Successfully saved entry with ID:', entryId);
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Continue with the analysis even if saving fails
      }
      
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      
      if (error.message.includes('quota') || error.message.includes('exceeded')) {
        setError('API quota exceeded. Please try again later or check your billing details.');
      } else if (error.message.includes('content_policy') || error.message.includes('policy')) {
        setError('Image could not be analyzed due to content policy restrictions. Please try a different image.');
      } else if (error.message.includes('API_NOT_CONFIGURED') || error.message.includes('configured')) {
        setError('OpenAI API is not properly configured. Please check your API key settings.');
      } else if (error.message.includes('Invalid API key')) {
        setError('Invalid OpenAI API key. Please check your API key settings.');
      } else {
        setError(`Failed to analyze refrigerator contents: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToGalleryAndRedirect = () => {
    // Analysis is already saved to the database during analyzeImage
    // Navigate to the refrigerator grid instead of the gallery
    navigate('/refrigerator');
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setAnalysis(null);
    setError(null);
    setShowCamera(false);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <p className="text-sm text-yellow-700">Please log in to analyze your refrigerator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white drop-shadow-sm">Analyze Refrigerator Contents</h2>
        <p className="text-white text-sm md:text-base opacity-90 mt-2">Take a photo or upload an image to get detailed inventory analysis and recipe suggestions</p>
      </div>

      {showCamera && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 shadow-lg">
          <CameraComponent
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        </div>
      )}
      
      {!selectedImage && !showCamera && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <button
            onClick={() => setShowCamera(true)}
            className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
          >
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors duration-300">
              <Camera className="w-8 h-8 text-blue-600" />
            </div>
            <span className="text-gray-800 font-medium text-lg">Take Photo</span>
            <p className="text-gray-500 text-sm mt-2">Use your device camera</p>
          </button>

          <label className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors duration-300">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <span className="text-gray-800 font-medium text-lg">Upload Photo</span>
            <p className="text-gray-500 text-sm mt-2">Select from your gallery</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {error && (
        <div className="bg-white/80 rounded-xl shadow-md p-4 mb-6 backdrop-blur-sm">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}

      {selectedImage && (
        <div className="bg-white rounded-2xl shadow-lg mb-8 relative overflow-hidden">
          <div className="relative">
            <img
              src={selectedImage}
              alt="Refrigerator contents"
              className="w-full h-64 sm:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          </div>
          
          <button
            onClick={resetAnalysis}
            className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/20 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="p-6">
            <button
              onClick={analyzeImage}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2">Analyzing your refrigerator...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Analyze Contents
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
              Refrigerator Analysis
            </h3>
            
            {analysis?.items?.length > 0 && (
              <div className="mb-8">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Items Detected
                </h4>
                <div className="grid gap-4">
                  {analysis.items.map((item, index) => item && (
                    <div key={index} className="bg-white border border-blue-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                      <div className="flex justify-between items-start">
                        <h5 className="font-semibold text-gray-800 text-base">{item?.name || 'Unnamed Item'}</h5>
                        {item?.brand && <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">{item.brand}</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-gray-300 mr-2"></div>
                          <span className="text-sm text-gray-500">Category: </span>
                          <span className="text-sm text-gray-800 ml-1 font-medium">{item?.category || 'Uncategorized'}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-gray-300 mr-2"></div>
                          <span className="text-sm text-gray-500">Quantity: </span>
                          <span className="text-sm text-gray-800 ml-1 font-medium">{item?.quantity || 'Unknown'}</span>
                        </div>
                        
                        {item?.estimatedExpiry && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-orange-400 mr-2"></div>
                            <span className="text-sm text-gray-500">Expires: </span>
                            <span className="text-sm text-gray-800 ml-1 font-medium">{new Date(item?.estimatedExpiry).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {item?.daysUntilExpiry !== undefined && (
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full ${(item?.daysUntilExpiry || 0) < 3 ? 'bg-red-500' : 'bg-yellow-400'} mr-2`}></div>
                            <span className="text-sm text-gray-500">Status: </span>
                            <span className={`text-sm ml-1 font-medium ${(item?.daysUntilExpiry || 0) < 3 ? 'text-red-600' : 'text-orange-600'}`}>
                              {(item?.daysUntilExpiry || 0) < 0 ? 'Expired' : `${item?.daysUntilExpiry || 0} days remaining`}
                            </span>
                          </div>
                        )}
                        
                        {item?.nutritionSummary && (
                          <div className="flex items-start col-span-full mt-1">
                            <div className="w-2 h-2 rounded-full bg-green-400 mr-2 mt-1.5"></div>
                            <div>
                              <span className="text-sm text-gray-500">Nutrition: </span>
                              <span className="text-sm text-gray-800">{item?.nutritionSummary}</span>
                            </div>
                          </div>
                        )}
                        
                        {item?.storageRecommendation && (
                          <div className="flex items-start col-span-full mt-1">
                            <div className="w-2 h-2 rounded-full bg-blue-400 mr-2 mt-1.5"></div>
                            <div>
                              <span className="text-sm text-gray-500">Storage: </span>
                              <span className="text-sm text-gray-800">{item?.storageRecommendation}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis?.expiringItems?.length > 0 && (
              <div className="mb-8">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Items to Use Soon
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {analysis.expiringItems.map((item, index) => item && (
                    <div key={index} className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="font-medium text-yellow-800 text-base">{item?.name || 'Unnamed Item'}</h5>
                          {item?.daysUntilExpiry !== undefined && (
                            <span className={`text-xs ${(item?.daysUntilExpiry || 0) <= 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'} px-2 py-0.5 rounded-full mt-1 inline-block`}>
                              {(item?.daysUntilExpiry || 0) <= 0 ? 'Expired!' : `${item?.daysUntilExpiry || 0} days left`}
                            </span>
                          )}
                        </div>
                      </div>
                      {item?.recommendation && (
                        <div className="ml-11 text-sm text-yellow-700 bg-yellow-100/50 p-2 rounded-lg">
                          {item?.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis?.suggestedRecipes?.length > 0 && (
              <div className="mb-8">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Suggested Recipes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.suggestedRecipes.map((recipe, index) => recipe && (
                    <div key={index} className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                      <h5 className="font-semibold text-green-800 text-base mb-2">{recipe?.name || 'Unnamed Recipe'}</h5>
                      <p className="text-sm text-green-700 mb-3">{recipe?.description || 'No description available'}</p>
                      
                      {recipe?.ingredients?.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-xs text-green-700 font-medium mb-1.5">Ingredients:</h6>
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.ingredients.map((ingredient, idx) => ingredient && (
                              <span key={idx} className="bg-white text-green-700 px-2 py-0.5 rounded-full text-xs border border-green-200">
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap justify-between text-xs text-green-700 mt-3 pt-3 border-t border-green-200">
                        {recipe.nutritionEstimate && (
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            {recipe.nutritionEstimate}
                          </div>
                        )}
                        {recipe.preparationTime && (
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {recipe.preparationTime}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory Summary */}
            {analysis?.inventorySummary && (
              <div className="mb-8">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Inventory Summary
                </h4>
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-indigo-100">
                      <div className="text-indigo-600 text-xs font-medium mb-1">Total Items</div>
                      <div className="font-bold text-indigo-700 text-xl">{analysis?.inventorySummary?.totalItems || 0}</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-orange-100">
                      <div className="text-orange-600 text-xs font-medium mb-1">Expiring 3 Days</div>
                      <div className="font-bold text-orange-600 text-xl">{analysis?.inventorySummary?.expiringWithin3Days || 0}</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-yellow-100">
                      <div className="text-yellow-600 text-xs font-medium mb-1">Expiring 7 Days</div>
                      <div className="font-bold text-yellow-600 text-xl">{analysis?.inventorySummary?.expiringWithin7Days || 0}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-700 mb-1.5 text-sm">Nutritional Balance:</div>
                    <div className="text-indigo-600 text-sm bg-white p-3 rounded-lg border border-indigo-100">
                      {analysis?.inventorySummary?.nutritionalBalance || 'No data available'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Food Groups */}
            {analysis?.foodGroups && (
              <div className="mb-8">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-4.5-8.599A5 5 0 105.5 10.5" />
                  </svg>
                  Food Group Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <h5 className="font-medium text-green-800 text-sm">Well Stocked</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.foodGroups["Well Stocked"]?.length > 0 ? analysis.foodGroups["Well Stocked"].map((group, idx) => (
                        <span key={idx} className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs border border-green-100">{group}</span>
                      )) : <span className="text-xs text-gray-500">None</span>}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                      <h5 className="font-medium text-yellow-800 text-sm">Low Stock</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.foodGroups["Low Stock"]?.length > 0 ? analysis.foodGroups["Low Stock"].map((group, idx) => (
                        <span key={idx} className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-xs border border-yellow-100">{group}</span>
                      )) : <span className="text-xs text-gray-500">None</span>}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      <h5 className="font-medium text-red-800 text-sm">Missing</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.foodGroups["Missing"]?.length > 0 ? analysis.foodGroups["Missing"].map((group, idx) => (
                        <span key={idx} className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs border border-red-100">{group}</span>
                      )) : <span className="text-xs text-gray-500">None</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shopping Recommendations */}
            {analysis?.shoppingRecommendations && analysis.shoppingRecommendations.length > 0 && (
              <div className="mb-8">
                <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Shopping Recommendations
                </h4>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex flex-wrap gap-2">
                    {analysis.shoppingRecommendations.map((item, idx) => item && (
                      <span key={idx} className="bg-white text-blue-700 px-3 py-1 rounded-full text-xs border border-blue-200">{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={resetAnalysis}
                className="px-5 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Analyze Another
              </button>
              
              <button
                onClick={saveToGalleryAndRedirect}
                className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                View in Refrigerator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefrigeratorAnalysis;