import React, { useState, useCallback } from 'react';
import { Camera, Upload, X, AlertCircle } from 'lucide-react';
import OpenAIService from '../services/openaiService';
import dbService from '../db/database';
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

const processImage = async (imageData) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > height && width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      } else if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with reduced quality
      const processedImage = canvas.toDataURL('image/jpeg', 0.7);
      resolve(processedImage);
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

  const openaiService = new OpenAIService();

  const handleImageUpload = useCallback((event) => {
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

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
      setAnalysis(null);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCameraCapture = async (imageData) => {
    try {
      const processedImage = await processImage(imageData);
      setSelectedImage(processedImage);
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

    setLoading(true);
    setError(null);

    try {
      // Process the image before analysis
      const processedImage = await processImage(selectedImage);
      const base64Image = processedImage.split(',')[1];
      
      console.log('Analyzing refrigerator image...');
      console.log('Image size (bytes):', Math.round(base64Image.length * 0.75));

      const result = await openaiService.analyzeRefrigeratorImage(base64Image);

      if (result.error) {
        throw new Error('Failed to analyze refrigerator content');
      }

      // Save to database
      await dbService.addFoodEntry({
        userId: 1,
        imagePath: processedImage,
        type: 'refrigerator',
        items: result.items,
        expiringItems: result.expiringItems,
        suggestedRecipes: result.suggestedRecipes,
        analysisData: JSON.stringify(result),
        created_at: new Date().toISOString()
      });

      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      
      if (error.message.includes('quota')) {
        setError('API quota exceeded. Please try again later.');
      } else if (error.message.includes('content_policy')) {
        setError('Image could not be analyzed. Please ensure it shows refrigerator contents clearly.');
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
                <span className="ml-2">Analyzing Contents...</span>
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
            <h4 className="font-medium text-gray-700 mb-2">Available Items:</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.items.map((item, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Expiring Items */}
          {analysis.expiringItems?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Items to Use Soon:</h4>
              <div className="space-y-2">
                {analysis.expiringItems.map((item, index) => (
                  <div key={index} className="bg-yellow-50 p-3 rounded-lg text-yellow-700 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Recipes */}
          {analysis.suggestedRecipes?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Suggested Recipes:</h4>
              <div className="space-y-3">
                {analysis.suggestedRecipes.map((recipe, index) => (
                  <div key={index} className="bg-green-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-800">{recipe.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
                    {recipe.ingredients && (
                      <div className="mt-2 flex flex-wrap gap-1">
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