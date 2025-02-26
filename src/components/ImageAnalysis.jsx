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
      
      const result = await openaiService.analyzeImage(imageToSend);

      if (result.error) {
        throw new Error('Failed to analyze image content');
      }

      // Save the analysis to Firebase
      try {
        await dbService.addFoodEntry(user.uid, {
          imagePath: selectedImage,
          foodName: result.foodName,
          calories: result.calories || 0,
          healthScore: result.healthScore || 0,
          analysisData: JSON.stringify(result),
          type: 'food',
          created_at: new Date()
        });
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
        setError(`Failed to analyze image: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
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
        <div className="mt-6">
          <div className="card-base p-6">
            <h3 className="text-xl font-semibold mb-4">{analysis.foodName}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Calories</p>
                <p className="text-xl font-bold text-blue-600">{analysis.calories}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Health Score</p>
                <p className="text-xl font-bold text-green-600">{analysis.healthScore}/10</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-1">Benefits</h4>
              <p className="text-gray-600">{analysis.benefits}</p>
            </div>
            
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-1">Concerns</h4>
              <p className="text-gray-600">{analysis.concerns}</p>
            </div>
            
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
                View in Gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysis;