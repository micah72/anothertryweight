import React, { useState, useCallback } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import OpenAIService from '../services/openaiService';
import dbService from '../db/database';
import LoadingSpinner from './LoadingSpinner';

const ImageAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  // Create OpenAI service instance
  const openaiService = new OpenAIService();

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    try {
      const base64Image = selectedImage.split(',')[1];
      const result = await openaiService.analyzeImage(base64Image);
      
      if (result.error) {
        setError('Could not analyze the image properly. Please try again.');
        return;
      }

      // Save to database
      await dbService.addFoodEntry({
        userId: 1,
        imagePath: selectedImage,
        foodName: result.foodName,
        calories: result.calories || 0,
        healthScore: result.healthScore || 0,
        analysisData: JSON.stringify(result)
      });

      setAnalysis(result);
    } catch (error) {
      setError('Failed to analyze image. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Analyze Food</h2>
      
      {/* Image Capture Options */}
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

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className="card-base mb-6 relative">
          <button
            onClick={resetAnalysis}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt="Selected food"
            className="w-full rounded-lg"
          />
          <button
            onClick={analyzeImage}
            disabled={loading}
            className="button-base w-full mt-4"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner />
                <span className="ml-2">Analyzing...</span>
              </div>
            ) : (
              'Analyze Food'
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="card-base space-y-4">
          <h3 className="text-xl font-semibold">Analysis Results</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Food Name</p>
              <p className="font-semibold">{analysis.foodName}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Calories</p>
              <p className="font-semibold">{analysis.calories} kcal</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Health Score</p>
              <p className="font-semibold">{analysis.healthScore}/10</p>
            </div>
          </div>
          
          {analysis.benefits && (
            <div>
              <p className="text-sm text-gray-500">Nutritional Benefits</p>
              <p className="text-gray-700">{analysis.benefits}</p>
            </div>
          )}
          
          {analysis.concerns && (
            <div>
              <p className="text-sm text-gray-500">Health Concerns</p>
              <p className="text-gray-700">{analysis.concerns}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageAnalysis;