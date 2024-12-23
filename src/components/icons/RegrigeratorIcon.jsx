import React from 'react';

const RefrigeratorIcon = ({ className = "w-6 h-6", strokeWidth = 2 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="8" y1="6" x2="8" y2="6" />
    <line x1="8" y1="14" x2="8" y2="14" />
  </svg>
);

export default RefrigeratorIcon;