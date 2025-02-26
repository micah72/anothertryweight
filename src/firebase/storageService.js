import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

const storageService = {
  /**
   * Upload an image to Firebase Storage
   * @param {string} userId - The user ID
   * @param {string} imageDataUrl - The image data URL (base64)
   * @param {string} type - The type of image (food, refrigerator, etc.)
   * @returns {Promise<string>} - The download URL of the uploaded image
   */
  uploadImage: async (userId, imageDataUrl, type = 'food') => {
    try {
      // Create a unique filename
      const timestamp = new Date().getTime();
      const filename = `${type}_${timestamp}`;
      const imagePath = `users/${userId}/${type}/${filename}`;
      
      // Create a reference to the file location
      const storageRef = ref(storage, imagePath);
      
      // Upload the image
      await uploadString(storageRef, imageDataUrl, 'data_url');
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },
  
  /**
   * Delete an image from Firebase Storage
   * @param {string} imageUrl - The full URL of the image to delete
   * @returns {Promise<void>}
   */
  deleteImage: async (imageUrl) => {
    try {
      // Extract the path from the URL
      const storageRef = ref(storage, imageUrl);
      
      // Delete the file
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
};

export default storageService; 