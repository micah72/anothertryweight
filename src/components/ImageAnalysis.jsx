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
      setError('Please log in to analyze images');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Analyzing image...');
      
      // Send the full image data URL
      const result = await openaiService.analyzeImage(selectedImage);

      if (result.error) {
        throw new Error('Failed to analyze image content');
      }

      await dbService.addFoodEntry(user.uid, {
        imagePath: selectedImage,
        foodName: result.foodName,
        calories: result.calories || 0,
        healthScore: result.healthScore || 0,
        analysisData: JSON.stringify(result),
        type: 'food'
      });

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
        setError('Failed to analyze image. Please try again.');
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
            <p className="text-sm text-yellow-700">Please log in to analyze food images.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Analyze Food</h2>

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
            alt="Selected food"
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
              'Analyze Food'
            )}
          </button>
        </div>
      )}

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
              <div className="flex items-center">
                <p className="font-semibold">{analysis.healthScore}/10</p>
                <div 
                  className="ml-2 h-2 w-24 bg-gray-200 rounded-full overflow-hidden"
                >
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(analysis.healthScore / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {analysis.benefits && (
            <div>
              <p className="text-sm text-gray-500">Nutritional Benefits</p>
              <p className="text-gray-700 bg-green-50 p-3 rounded-lg">
                {analysis.benefits}
              </p>
            </div>
          )}
          
          {analysis.concerns && (
            <div>
              <p className="text-sm text-gray-500">Health Concerns</p>
              <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg">
                {analysis.concerns}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageAnalysis;