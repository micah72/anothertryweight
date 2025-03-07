import React, { useState, useEffect } from 'react';

/**
 * DevModeToggle - A component that allows toggling development mode for testing
 * 
 * This component is only visible in development mode and allows bypassing
 * authentication for easier testing of protected routes.
 */
const DevModeToggle = () => {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Only show in development mode
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    setIsVisible(isDevelopment);
    
    // Check if dev mode bypass is enabled
    const bypassEnabled = localStorage.getItem('devModeBypass') === 'true';
    setIsDevMode(bypassEnabled);
  }, []);
  
  // Toggle dev mode bypass
  const toggleDevMode = () => {
    const newState = !isDevMode;
    localStorage.setItem('devModeBypass', newState.toString());
    setIsDevMode(newState);
    
    // Reload to apply changes
    window.location.reload();
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-md p-3 shadow-lg">
        <div className="flex items-center">
          <div className="mr-3">
            <div className="text-sm font-semibold text-yellow-800">Development Mode</div>
            <div className="text-xs text-yellow-700">
              {isDevMode ? 'Auth bypass enabled' : 'Auth bypass disabled'}
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={isDevMode}
              onChange={toggleDevMode}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {isDevMode && (
          <div className="mt-2 text-xs text-yellow-800">
            <strong>Warning:</strong> Authentication is bypassed. All protected routes are accessible.
          </div>
        )}
      </div>
    </div>
  );
};

export default DevModeToggle;
