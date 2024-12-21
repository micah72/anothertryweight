const saveImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64String = reader.result;
          // Store in localStorage for demo purposes
          // In production, you'd want to use a proper storage solution
          const images = JSON.parse(localStorage.getItem('foodImages') || '[]');
          const imageId = Date.now();
          images.push({
            id: imageId,
            data: base64String,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('foodImages', JSON.stringify(images));
          resolve({
            id: imageId,
            url: base64String
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const getImage = (imageId) => {
    const images = JSON.parse(localStorage.getItem('foodImages') || '[]');
    const image = images.find(img => img.id === imageId);
    return image ? image.data : null;
  };
  
  export { saveImage, getImage };