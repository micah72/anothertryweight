import React from 'react';

const LoadingSpinner = ({ size = 'md', small = false }) => {
  // Map size to dimensions
  let dimensions = 'h-8 w-8';
  let padding = 'p-4';
  
  if (small || size === 'sm') {
    dimensions = 'h-5 w-5';
    padding = 'p-2';
  } else if (size === 'xs') {
    dimensions = 'h-3 w-3';
    padding = 'p-1';
  } else if (size === 'lg') {
    dimensions = 'h-10 w-10';
    padding = 'p-4';
  }
  
  return (
    <div className={`flex justify-center items-center ${padding}`}>
      <div className={`animate-spin rounded-full ${dimensions} border-b-2 border-primary-500`}></div>
    </div>
  );
};

export default LoadingSpinner;