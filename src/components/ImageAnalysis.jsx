import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Upload, X, AlertCircle, Edit2 } from 'lucide-react';
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
      
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;

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

      // Use a fixed quality of 0.8 for better consistency
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = imageData;
  });
};

const ImageAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFoodName, setEditedFoodName] = useState('');
  const [foodEntryId, setFoodEntryId] = useState(null);
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

  const analyzeImage = async (customFoodName = null) => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    if (!user) {
      setError('Please log in to analyze images');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Analyzing image...');
      
      // Make sure we're sending the image in the correct format
      const imageToSend = selectedImage.startsWith('data:') 
        ? selectedImage 
        : `data:image/jpeg;base64,${selectedImage}`;
      
      // Call OpenAI API to analyze the image
      const result = await openaiService.analyzeImage(imageToSend, customFoodName);
      
      // Logging the result for debugging
      console.log('OpenAI Analysis Result:', result);

      if (result.error) {
        throw new Error('Failed to analyze image content');
      }
      
      // Ensure we have all required nutritional values
      const processedResult = {
        foodName: customFoodName || result.foodName || 'Unknown Food',
        calories: result.calories || 0,
        healthScore: result.healthScore || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0,
        fiber: result.fiber || 0,
        sugars: result.sugars || 0,
        benefits: result.benefits || 'No benefits information available',
        concerns: result.concerns || 'No concerns information available',
        portionSize: result.portionSize || 'Standard serving',
        nutritionSource: result.nutritionSource || 'Estimated by AI',
        healthScoreReason: result.healthScoreReason || 'Based on overall nutritional value',
        analysisData: JSON.stringify({
          protein: result.protein || 0,
          carbs: result.carbs || 0,
          fat: result.fat || 0,
          fiber: result.fiber || 0,
          sugars: result.sugars || 0,
          benefits: result.benefits || 'No benefits information available',
          concerns: result.concerns || 'No concerns information available',
          nutritionSource: result.nutritionSource || 'Estimated by AI',
          healthScoreReason: result.healthScoreReason || 'Based on overall nutritional value',
          portionSize: result.portionSize || 'Standard serving',
          standardServingSize: result.standardServingSize || 'Standard serving',
          relativePortionSize: result.relativePortionSize || 1.0,
          actualAmountDescription: result.actualAmountDescription || 'Standard serving size'
        })
      };

      console.log('Processed Result for Display:', processedResult);

      // If we already have a food entry ID and we're correcting the name, update the existing entry
      if (foodEntryId && customFoodName) {
        try {
          await dbService.updateFoodEntry(foodEntryId, {
            foodName: processedResult.foodName,
            calories: processedResult.calories,
            healthScore: processedResult.healthScore,
            analysisData: processedResult.analysisData
          });
          console.log('Updated existing food entry with corrected data');
        } catch (dbError) {
          console.error('Error updating database with corrected data:', dbError);
        }
      } else {
        // Save the analysis to Firebase as a new entry
        try {
          const entryId = await dbService.addFoodEntry(user.uid, {
            imagePath: selectedImage,
            foodName: processedResult.foodName,
            calories: processedResult.calories,
            healthScore: processedResult.healthScore,
            analysisData: processedResult.analysisData,
            type: 'food',
            created_at: new Date()
          });
          setFoodEntryId(entryId);
        } catch (dbError) {
          console.error('Error saving to database:', dbError);
          // Continue with the analysis even if saving fails
        }
      }

      setAnalysis(processedResult);
      // Reset editing state
      setIsEditingName(false);
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
        setError(`Failed to analyze image: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditNameClick = () => {
    setEditedFoodName(analysis.foodName);
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedFoodName('');
  };

  const handleNameChange = (e) => {
    setEditedFoodName(e.target.value);
  };

  const handleSubmitNameEdit = async (e) => {
    e.preventDefault();
    if (!editedFoodName.trim()) {
      return;
    }
    
    // Reanalyze with the corrected food name
    await analyzeImage(editedFoodName.trim());
  };

  const saveToGalleryAndRedirect = () => {
    // Analysis is already saved to the database during analyzeImage
    // Just navigate to the gallery
    navigate('/gallery');
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
            <p className="text-sm text-yellow-700">Please log in to analyze food images.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white drop-shadow-sm">Analyze Food</h2>
        <p className="text-white text-sm md:text-base opacity-90 mt-2">Take a photo or upload an image to get detailed nutritional information</p>
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
              alt="Selected food"
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
              onClick={() => analyzeImage()}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-70 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2">Analyzing your food...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Analyze Food
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {analysis && !isEditingName && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{analysis.foodName}</h3>
              <button 
                onClick={handleEditNameClick}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                title="Edit food name"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                <span className="text-sm">Edit</span>
              </button>
            </div>
            
            {/* Main nutrition metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-blue-100 p-4 rounded-xl shadow-sm flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Calories</p>
                  <p className="text-xl font-bold text-blue-600">{analysis.calories}</p>
                </div>
              </div>
              <div className="bg-white border border-green-100 p-4 rounded-xl shadow-sm flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Health Score</p>
                  <p className="text-xl font-bold text-green-600">{analysis.healthScore}/10</p>
                </div>
              </div>
            </div>
            
            {/* Macronutrients */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-red-100 p-4 rounded-xl shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                  <p className="text-sm text-gray-500">Protein</p>
                </div>
                <p className="text-xl font-bold text-red-600">{analysis.protein || 0}g</p>
              </div>
              <div className="bg-white border border-yellow-100 p-4 rounded-xl shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                  <p className="text-sm text-gray-500">Carbs</p>
                </div>
                <p className="text-xl font-bold text-yellow-600">{analysis.carbs || 0}g</p>
              </div>
              <div className="bg-white border border-purple-100 p-4 rounded-xl shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                  <p className="text-sm text-gray-500">Fat</p>
                </div>
                <p className="text-xl font-bold text-purple-600">{analysis.fat || 0}g</p>
              </div>
            </div>
            
            {/* Additional nutrients */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-teal-100 p-4 rounded-xl shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mr-2"></div>
                  <p className="text-sm text-gray-500">Fiber</p>
                </div>
                <p className="text-xl font-bold text-teal-600">{analysis.fiber || 0}g</p>
              </div>
              <div className="bg-white border border-orange-100 p-4 rounded-xl shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                  <p className="text-sm text-gray-500">Sugars</p>
                </div>
                <p className="text-xl font-bold text-orange-600">{analysis.sugars || 0}g</p>
              </div>
            </div>
            
            {/* Health information */}
            <div className="border border-gray-100 rounded-xl p-6 mb-6 shadow-sm">
              <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
                Health Analysis
              </h4>
              
              <div className="mb-5">
                <h5 className="font-medium text-gray-700 mb-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Health Score Explanation
                </h5>
                <p className="text-gray-600 text-sm">{analysis.healthScoreReason}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h5 className="font-medium text-green-700 mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Benefits
                  </h5>
                  <p className="text-sm text-green-800">{analysis.benefits}</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h5 className="font-medium text-red-700 mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Concerns
                  </h5>
                  <p className="text-sm text-red-800">{analysis.concerns}</p>
                </div>
              </div>
            </div>

            {/* Portion Information */}
            <div className="bg-amber-50 p-5 rounded-xl mb-6 border border-amber-100">
              <h4 className="text-base font-semibold text-amber-800 mb-4 flex items-center">
                <span className="w-1.5 h-5 bg-amber-500 rounded-full mr-2"></span>
                Portion Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-xs font-medium text-gray-500 mb-1">Visible Portion</p>
                  <p className="text-sm text-gray-700 font-medium">{analysis.portionSize}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-xs font-medium text-gray-500 mb-1">Standard Serving</p>
                  <p className="text-sm text-gray-700 font-medium">{analysis.standardServingSize}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-xs font-medium text-gray-500 mb-1">Relative Size</p>
                  <p className="text-sm text-gray-700 font-medium">{analysis.actualAmountDescription} {analysis.relativePortionSize ? `(${analysis.relativePortionSize.toFixed(1)}x)` : ''}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white/50 rounded-lg">
                <p className="text-xs text-amber-700">The nutritional values above are calculated based on the actual portion visible in the image.</p>
              </div>
            </div>
            
            {/* Data source */}
            <div className="mb-8 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Nutrition Data Source
              </h4>
              <p className="text-sm text-gray-600">{analysis.nutritionSource}</p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                View in Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {analysis && isEditingName && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Food Name</h3>
            <p className="text-sm text-gray-600 mb-4">
              If the AI incorrectly identified your food, you can edit the name and rescan to get accurate nutritional information.
            </p>
            
            <form onSubmit={handleSubmitNameEdit} className="mb-6">
              <div className="mb-4">
                <label htmlFor="foodName" className="block text-sm font-medium text-gray-700 mb-1">
                  Food Name
                </label>
                <input
                  type="text"
                  id="foodName"
                  value={editedFoodName}
                  onChange={handleNameChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter correct food name"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rescan with Correct Name
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysis;