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
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Analyze Refrigerator Contents</h2>

      {showCamera && (
        <CameraComponent
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      
      {!selectedImage && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowCamera(true)}
            className="card-base flex flex-col items-center justify-center p-8 hover:bg-gray-50"
          >
            <Camera className="w-8 h-8 mb-2 text-primary" />
            <span>Take Photo</span>
          </button>

          <label className="card-base flex flex-col items-center justify-center p-8 hover:bg-gray-50 cursor-pointer">
            <Upload className="w-8 h-8 mb-2 text-primary" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {selectedImage && (
        <div className="card-base mb-6 relative">
          <button
            onClick={resetAnalysis}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="Refrigerator contents"
            className="w-full rounded-lg"
          />
          <button
            onClick={analyzeImage}
            disabled={loading}
            className="button-base w-full mt-4 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner />
                <span className="ml-2">Analyzing...</span>
              </div>
            ) : (
              'Analyze Contents'
            )}
          </button>
        </div>
      )}

      {analysis && (
        <div className="mt-6">
          <div className="card-base p-6">
            <h3 className="text-xl font-semibold mb-4">Refrigerator Analysis</h3>
            
            {analysis?.items?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Items Detected</h4>
                <div className="grid gap-3">
                  {analysis.items.map((item, index) => item && (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-gray-800">{item?.name || 'Unnamed Item'}</h5>
                        {item?.brand && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{item.brand}</span>}
                      </div>
                      <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        <div><span className="text-gray-600">Category:</span> {item?.category || 'Uncategorized'}</div>
                        <div><span className="text-gray-600">Quantity:</span> {item?.quantity || 'Unknown'}</div>
                        {item?.estimatedExpiry && (
                          <div><span className="text-gray-600">Expires:</span> {new Date(item?.estimatedExpiry).toLocaleDateString()}</div>
                        )}
                        {item?.daysUntilExpiry !== undefined && (
                          <div className={`${(item?.daysUntilExpiry || 0) < 3 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {(item?.daysUntilExpiry || 0) < 0 ? 'Expired' : `${item?.daysUntilExpiry || 0} days remaining`}
                          </div>
                        )}
                        {item?.nutritionSummary && (
                          <div className="col-span-2 mt-1"><span className="text-gray-600">Nutrition:</span> {item?.nutritionSummary}</div>
                        )}
                        {item?.storageRecommendation && (
                          <div className="col-span-2 mt-1"><span className="text-gray-600">Storage:</span> {item?.storageRecommendation}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis?.expiringItems?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Items to Use Soon</h4>
                <div className="grid gap-2">
                  {analysis.expiringItems.map((item, index) => item && (
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="font-medium">{item?.name || 'Unnamed Item'}</span>
                        {item?.daysUntilExpiry !== undefined && (
                          <span className="ml-2 text-sm text-orange-600">
                            {(item?.daysUntilExpiry || 0) <= 0 ? 'Expired!' : `${item?.daysUntilExpiry || 0} days left`}
                          </span>
                        )}
                      </div>
                      {item?.recommendation && (
                        <div className="text-sm text-gray-700">{item?.recommendation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis?.suggestedRecipes?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Suggested Recipes</h4>
                <div className="space-y-3">
                  {analysis.suggestedRecipes.map((recipe, index) => recipe && (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium text-gray-800">{recipe?.name || 'Unnamed Recipe'}</h5>
                      <p className="text-sm text-gray-600 mb-2">{recipe?.description || 'No description available'}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {recipe?.ingredients?.map((ingredient, idx) => ingredient && (
                          <span key={idx} className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">
                            {ingredient}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs grid grid-cols-2 gap-2 text-gray-600 mt-2 pt-2 border-t border-gray-100">
                        {recipe.nutritionEstimate && (
                          <div><span className="font-medium">Nutrition:</span> {recipe.nutritionEstimate}</div>
                        )}
                        {recipe.preparationTime && (
                          <div><span className="font-medium">Prep Time:</span> {recipe.preparationTime}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Inventory Summary */}
            {analysis?.inventorySummary && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Inventory Summary</h4>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center p-2 bg-white rounded shadow-sm">
                      <div className="text-gray-600 text-xs">Total Items</div>
                      <div className="font-bold text-indigo-600">{analysis?.inventorySummary?.totalItems || 0}</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded shadow-sm">
                      <div className="text-gray-600 text-xs">Expiring 3 Days</div>
                      <div className="font-bold text-orange-500">{analysis?.inventorySummary?.expiringWithin3Days || 0}</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded shadow-sm">
                      <div className="text-gray-600 text-xs">Expiring 7 Days</div>
                      <div className="font-bold text-yellow-500">{analysis?.inventorySummary?.expiringWithin7Days || 0}</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">Nutritional Balance:</div>
                    <div className="text-gray-700">{analysis?.inventorySummary?.nutritionalBalance || 'No data available'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Food Groups */}
            {analysis?.foodGroups && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Food Groups</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h5 className="font-medium text-green-800 text-sm mb-1">Well Stocked</h5>
                    <div className="flex flex-wrap gap-1">
                      {analysis.foodGroups["Well Stocked"]?.length > 0 ? analysis.foodGroups["Well Stocked"].map((group, idx) => (
                        <span key={idx} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{group}</span>
                      )) : <span className="text-xs text-gray-500">None</span>}
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h5 className="font-medium text-yellow-800 text-sm mb-1">Low Stock</h5>
                    <div className="flex flex-wrap gap-1">
                      {analysis.foodGroups["Low Stock"]?.length > 0 ? analysis.foodGroups["Low Stock"].map((group, idx) => (
                        <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">{group}</span>
                      )) : <span className="text-xs text-gray-500">None</span>}
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h5 className="font-medium text-red-800 text-sm mb-1">Missing</h5>
                    <div className="flex flex-wrap gap-1">
                      {analysis.foodGroups["Missing"]?.length > 0 ? analysis.foodGroups["Missing"].map((group, idx) => (
                        <span key={idx} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">{group}</span>
                      )) : <span className="text-xs text-gray-500">None</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shopping Recommendations */}
            {analysis?.shoppingRecommendations && analysis.shoppingRecommendations.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Shopping Recommendations</h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex flex-wrap gap-1">
                    {analysis.shoppingRecommendations.map((item, idx) => item && (
                      <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={resetAnalysis}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Analyze Another
              </button>
              
              <button
                onClick={saveToGalleryAndRedirect}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
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