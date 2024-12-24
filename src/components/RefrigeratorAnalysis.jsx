import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Upload, X, AlertCircle } from 'lucide-react';
import OpenAIService from '../services/openaiService';
import dbService from '../firebase/dbService';
import LoadingSpinner from './LoadingSpinner';
import CameraComponent from './Camera';

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

      const quality = Math.min(0.7, 800 / Math.max(width, height));
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = imageData;
  });
};

const RefrigeratorAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const { user } = useAuth();

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
      const base64Image = selectedImage.split(',')[1];
      console.log('Analyzing refrigerator image...');
      console.log('Image size (bytes):', Math.round(base64Image.length * 0.75));

      const result = await openaiService.analyzeRefrigeratorImage(base64Image);

      if (result.error) {
        throw new Error('Failed to analyze refrigerator content');
      }

      // Create a properly structured entry object
      const entry = {
        type: 'refrigerator',
        imagePath: selectedImage,
        items: result.items || [],
        expiringItems: result.expiringItems || [],
        suggestedRecipes: result.suggestedRecipes || [],
        analysisData: JSON.stringify(result),
        created_at: new Date(),
        // Add required fields that were missing before
        foodName: 'Refrigerator Analysis',
        calories: 0,
        healthScore: 0
      };

      // Save to database with the complete entry object
      await dbService.addFoodEntry(user.uid, entry);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      
      if (error.message.includes('quota')) {
        setError('API quota exceeded. Please try again later.');
      } else if (error.message.includes('content_policy')) {
        setError('Image could not be analyzed. Please try a different image.');
      } else if (error.message.includes('API_NOT_CONFIGURED')) {
        setError('OpenAI API is not properly configured.');
      } else {
        setError('Failed to analyze refrigerator contents. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
        <div className="card-base space-y-4">
          <h3 className="text-xl font-semibold">Analysis Results</h3>

          {/* Available Items */}
          <div>
            <h4 className="text-sm font-medium text-gray-700">Available Items:</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {analysis.items.map((item, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Expiring Items */}
          {analysis.expiringItems?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">Items to Use Soon:</h4>
              <div className="space-y-2 mt-2">
                {analysis.expiringItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Recipes */}
          {analysis.suggestedRecipes?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">Suggested Recipes:</h4>
              <div className="space-y-3 mt-2">
                {analysis.suggestedRecipes.map((recipe, index) => (
                  <div
                    key={index}
                    className="bg-green-50 p-3 rounded"
                  >
                    <p className="font-medium text-green-800">{recipe.name}</p>
                    {recipe.description && (
                      <p className="text-sm text-green-600 mt-1">{recipe.description}</p>
                    )}
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {recipe.ingredients.map((ingredient, idx) => (
                          <span
                            key={idx}
                            className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RefrigeratorAnalysis;