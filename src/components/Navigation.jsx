import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, 
  X, 
  ChevronDown,
  Camera, 
  Home, 
  User, 
  Activity, 
  Calendar, 
  Utensils
} from 'lucide-react';

// Custom component for mobile dropdown icons
const MobileIcon = ({ icon, isHovered }) => {
  // Use the same icon but with blue color and proper size constraints
  return React.cloneElement(icon, {
    color: isHovered ? '#1d4ed8' : '#3b82f6',
    stroke: isHovered ? '#1d4ed8' : '#3b82f6',
    size: 20, // Set a fixed size for all icons
    style: {
      stroke: isHovered ? '#1d4ed8' : '#3b82f6',
      color: isHovered ? '#1d4ed8' : '#3b82f6',
      fill: 'none',
      pointerEvents: 'none', // Prevent the SVG from capturing hover events
      width: '20px',
      height: '20px',
      minWidth: '20px',
      minHeight: '20px',
      maxWidth: '20px',
      maxHeight: '20px',
      display: 'inline-block',
      verticalAlign: 'middle'
    },
    className: 'mobile-dropdown-svg'
  });
};

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRefs = useRef([]);
  const location = useLocation();
  const { user, isAdmin, isApproved, logout } = useAuth();
  
  // Determine if user is logged in based on auth context
  const isLoggedIn = !!user;

  // Add state for tracking hover on mobile dropdown items
  const [hoveredItem, setHoveredItem] = useState(null);

  // Add useEffect to handle touch events for mobile devices
  useEffect(() => {
    // Function to handle touch outside mobile dropdown items
    const handleTouchOutside = (event) => {
      // If we have a hovered item and the touch is outside any mobile dropdown items
      if (hoveredItem !== null) {
        // Check if the touch target is a mobile dropdown item or its child
        let targetEl = event.target;
        let isDropdownItem = false;
        
        while (targetEl) {
          if (targetEl.classList && (
            targetEl.classList.contains('mobile-dropdown-item') || 
            targetEl.classList.contains('mobile-dropdown-icon')
          )) {
            isDropdownItem = true;
            break;
          }
          targetEl = targetEl.parentElement;
        }
        
        // If touch is outside dropdown items, reset hover state
        if (!isDropdownItem) {
          setHoveredItem(null);
        }
      }
    };
    
    // Add touch event listeners with passive option for better performance
    document.addEventListener('touchstart', handleTouchOutside, { passive: true });
    
    // Cleanup function
    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [hoveredItem]);

  // Handle logout
  const handleLogout = async (e) => {
    // Prevent default to avoid navigation issues
    e.preventDefault();
    try {
      await logout();
      // Redirect will happen automatically due to auth state change
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Custom styling for SVG icons to maintain color on hover
  const svgStyle = {
    stroke: 'white',
    strokeWidth: 2,
    fill: 'none',
    color: 'white',
    pointerEvents: 'none' // Prevent SVG from capturing hover events
  };
  
  // Special style for mobile dropdown icons
  const mobileDropdownSvgStyle = {
    stroke: '#3b82f6 !important',
    strokeWidth: '2 !important',
    fill: 'none !important',
    color: '#3b82f6 !important'
  };

  const menuStructure = [
    {
      label: 'Home',
      path: '/',
      icon: <Home className="h-5 w-5" />,
      alwaysShow: true,
      hideWhenAdmin: true
    },
    {
      label: 'About',
      path: '/about',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>,
      alwaysShow: true,
      hideWhenAdmin: true
    },
    {
      label: 'Stay Healthy',
      path: '/stay-healthy',
      icon: <Activity className="h-5 w-5" />,
      alwaysShow: true,
      hideWhenAdmin: true
    },
    {
      label: 'Contact Us',
      path: '/contact',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>,
      alwaysShow: true,
      hideWhenAdmin: true
    },
    {
      label: 'Food Gallery',
      path: '/gallery',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>,
      requiresAuth: true
    },
    {
      label: 'Track',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>,
      requiresAuth: true,
      children: [
        { 
          label: 'Analyze Food', 
          path: '/analyze', 
          icon: <Camera className="h-5 w-5" />
        },
        { 
          label: 'Health Metrics', 
          path: '/health', 
          icon: <Activity className="h-5 w-5" />
        },
        { 
          label: 'Goals', 
          path: '/goals', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      ]
    },
    {
      label: 'Kitchen',
      icon: <Utensils className="h-5 w-5" />,
      requiresAuth: true,
      children: [
        { 
          label: 'Scan Contents', 
          path: '/scan', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        },
        { 
          label: 'My Refrigerator', 
          path: '/refrigerator', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      ]
    },
    {
      label: 'Plan',
      icon: <Calendar className="h-5 w-5" />,
      requiresAuth: true,
      children: [
        { 
          label: 'Meal Planner', 
          path: '/meal-planner', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        },
        { 
          label: 'Food Recommendations', 
          path: '/recommendations', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
        }
      ]
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: <User className="h-5 w-5" />,
      requiresAuth: true
    },
    {
      label: 'Admin Dashboard',
      path: '/admin-dashboard',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>,
      adminOnly: true
    },
    {
      label: 'Waitlist',
      path: '/waitlist',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>,
      adminOnly: true
    },
    {
      label: 'Logout',
      action: handleLogout,
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>,
      requiresAuth: true
    },
    {
      label: 'Login',
      path: '/login',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>,
      showWhenLoggedOut: true
    }
  ];

  // Initialize refs for dropdowns
  useEffect(() => {
    dropdownRefs.current = Array(menuStructure.length).fill().map(() => React.createRef());
    
    // Clean up function to prevent memory leaks
    return () => {
      // Remove any event listeners or classes when component unmounts
      document.body.classList.remove('mobile-menu-open');
      setIsOpen(false);
      setActiveDropdown(null);
    };
  }, [menuStructure.length]);

  // Filter menu items based on authentication status
  const filteredMenu = menuStructure.filter(item => {
    // Always show admin-only items to admins
    if (isAdmin && item.adminOnly) return true;
    
    // Always show items with alwaysShow that aren't hidden for admins
    if (item.alwaysShow && (!isAdmin || !item.hideWhenAdmin)) return true;
    
    // Show items requiring auth to logged in users (not admin-only ones unless user is admin)
    if (isLoggedIn && item.requiresAuth && (!item.adminOnly || isAdmin)) return true;
    
    // Show specific items for logged out users
    if (!isLoggedIn && item.showWhenLoggedOut) return true;
    
    return false;
  });

  // Add custom styles for dropdown buttons
  const activeButtonStyle = "bg-blue-700 text-white font-bold";
  const dropdownButtonStyle = "flex items-center justify-between bg-blue-600 text-white font-bold px-4 py-2 rounded-md text-sm transition-colors duration-200 nav-item focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-700 focus:ring-white cursor-pointer relative border-b-2 border-transparent hover:border-white hover:text-white";
  const menuItemStyle = "flex items-center bg-blue-600 text-white font-bold px-4 py-2 rounded-md text-sm transition-colors duration-200 nav-item border-b-2 border-transparent hover:border-white hover:text-white";
  const logoutButtonStyle = "flex items-center text-white bg-red-600 hover:bg-red-700 hover:text-white px-4 py-2 rounded-md text-sm font-bold transition-colors duration-200 nav-item";
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If an active dropdown exists
      if (activeDropdown !== null) {
        // Check if the click is outside both the dropdown button and its content
        const activeRef = dropdownRefs.current[activeDropdown];
        if (activeRef && activeRef.current && !activeRef.current.contains(event.target)) {
          setActiveDropdown(null);
        }
      }
    };

    // Use passive event listener to improve performance
    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Close dropdowns when navigating
  useEffect(() => {
    setActiveDropdown(null);
    setIsOpen(false);
    document.body.classList.remove('mobile-menu-open');
    setHoveredItem(null); // Reset hovered item on navigation
  }, [location.pathname]);

  // Toggle dropdown with improved handling
  const toggleDropdown = (index, e) => {
    // Prevent default to avoid navigation issues
    if (e) e.preventDefault();
    
    // Use functional update to ensure we're working with the latest state
    setActiveDropdown(prevActiveDropdown => {
      if (prevActiveDropdown === index) {
        return null;
      } else {
        return index;
      }
    });
  };

  // Toggle mobile menu with improved handling
  const toggleMenu = (e) => {
    // Prevent default to avoid navigation issues
    if (e) e.preventDefault();
    
    setIsOpen(prevIsOpen => {
      const newIsOpen = !prevIsOpen;
      
      // Add or remove a class to the body element
      if (newIsOpen) {
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.classList.remove('mobile-menu-open');
      }
      
      return newIsOpen;
    });
  };

  // Handle mobile link click to prevent blank screen
  const handleMobileLinkClick = (e) => {
    // Don't prevent default here - we want navigation to happen
    // Just clean up the mobile menu state
    setIsOpen(false);
    document.body.classList.remove('mobile-menu-open');
    setActiveDropdown(null);
    setHoveredItem(null);
  };

  // Add this utility function to handle hover state properly
  const handleItemHover = (itemKey, isEntering) => {
    // Use function form to ensure we're working with the latest state
    setHoveredItem(currentHoveredItem => {
      if (isEntering) {
        return itemKey;
      } else if (currentHoveredItem === itemKey) {
        return null;
      }
      return currentHoveredItem;
    });
  };

  return (
    <nav className="bg-blue-600 shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-white text-xl font-bold">
              SnapLicious AI
            </Link>
            {isLoggedIn && isAdmin && (
              <span className="ml-2 bg-yellow-400 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
                Admin
              </span>
            )}
          </div>

          {/* Desktop Menu - restructured to separate main items from logout */}
          <div className="hidden md:flex md:items-center md:justify-between md:flex-grow md:ml-8">
            {/* Main navigation items */}
            <div className="flex space-x-4">
              {filteredMenu
                .filter(item => item.label !== 'Logout') // Filter out Logout button for main nav
                .map((item, index) => (
                  item.children ? (
                    <div key={item.label} className="relative" ref={dropdownRefs.current[index]}>
                      <button
                        onClick={(e) => toggleDropdown(index, e)}
                        className={`${dropdownButtonStyle} ${activeDropdown === index ? activeButtonStyle : ''}`}
                        aria-expanded={activeDropdown === index}
                        aria-controls={`dropdown-${index}`}
                      >
                        <div className="flex items-center">
                          {item.icon && <span className="mr-2 text-white">{React.cloneElement(item.icon, { style: svgStyle })}</span>}
                          <span className="font-bold">{item.label}</span>
                          {/* Chevron indicator for dropdown */}
                          <ChevronDown className={`ml-1 h-4 w-4 text-white transition-transform duration-200 ${activeDropdown === index ? 'transform rotate-180' : ''}`} />
                        </div>
                      </button>
                      
                      <div 
                        id={`dropdown-${index}`}
                        className={`absolute z-20 mt-2 w-48 rounded-md shadow-lg bg-blue-700 ring-1 ring-black ring-opacity-5 dropdown-menu border border-blue-400 ${activeDropdown === index ? 'block' : 'hidden'}`}
                        style={{ maxHeight: '400px', overflowY: 'auto' }}
                      >
                        <div className="py-1">
                          {item.children.map(child => (
                            <Link
                              key={child.label}
                              to={child.path}
                              className="block w-full px-4 py-2 text-sm text-white hover:bg-blue-800 flex items-center group"
                              onClick={handleMobileLinkClick}
                            >
                              {child.icon && (
                                <span className="mr-2 inline-block text-white group-hover:text-white">
                                  {React.cloneElement(child.icon, { style: svgStyle })}
                                </span>
                              )}
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    item.action ? (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className={menuItemStyle}
                      >
                        {item.icon && <span className="mr-2">{item.icon}</span>}
                        <span className="font-bold">{item.label}</span>
                      </button>
                    ) : (
                      <Link
                        key={item.label}
                        to={item.path}
                        className={menuItemStyle}
                        onClick={handleMobileLinkClick}
                      >
                        {item.icon && <span className="mr-2">{item.icon}</span>}
                        <span className="font-bold">{item.label}</span>
                      </Link>
                    )
                  )
                ))}
            </div>
            
            {/* Logout button positioned on the far right */}
            <div className="flex items-center">
              {filteredMenu
                .filter(item => item.label === 'Logout')
                .map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={logoutButtonStyle}
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    <span>{item.label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="mobile-hamburger p-2 rounded-md focus:outline-none"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? 
                <X className="h-6 w-6" style={{ color: 'white', stroke: 'white', fill: 'none' }} /> : 
                <Menu className="h-6 w-6" style={{ color: 'white', stroke: 'white', fill: 'none' }} />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden mobile-nav-container">
          <div className="space-y-1 px-2 pt-2 pb-3 bg-blue-600 relative">
            <button
              onClick={toggleMenu}
              className="absolute top-2 right-2 inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-blue-700"
              style={{ backgroundColor: '#1d4ed8', color: 'white' }}
              aria-label="Close menu"
            >
              <X className="h-6 w-6" style={{ color: 'white', stroke: 'white', fill: 'none' }} />
            </button>
            {filteredMenu.map((item, index) => (
              item.children ? (
                <div key={item.label} className="block" ref={dropdownRefs.current[index]}>
                  <button
                    onClick={(e) => toggleDropdown(index, e)}
                    className={`flex items-center justify-between ${item.label === 'Track' || item.label === 'Kitchen' || item.label === 'Plan' ? 'bg-blue-600 text-white' : 'text-white'} font-bold hover:bg-blue-700 hover:text-white px-3 py-2 rounded-md text-base w-full nav-item focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-700 focus:ring-white cursor-pointer ${activeDropdown === index ? activeButtonStyle : ''}`}
                    style={{ 
                      backgroundColor: item.label === 'Track' || item.label === 'Kitchen' || item.label === 'Plan' ? '#2563eb' : '',
                      color: 'white'
                    }}
                    aria-expanded={activeDropdown === index}
                    aria-controls={`dropdown-${index}`}
                  >
                    <div className="flex items-center">
                      {item.icon && (
                        <span className={`mr-2 ${item.label === 'Track' || item.label === 'Kitchen' || item.label === 'Plan' ? 'text-white' : 'text-white'}`}>
                          {React.cloneElement(item.icon, { 
                            style: {
                              ...svgStyle,
                              stroke: 'white',
                              color: 'white',
                              fill: 'none'
                            } 
                          })}
                        </span>
                      )}
                      <span className="font-bold">{item.label}</span>
                      <ChevronDown className={`ml-1 h-4 w-4 ${item.label === 'Track' || item.label === 'Kitchen' || item.label === 'Plan' ? 'text-white' : 'text-white'} transition-transform duration-200 ${activeDropdown === index ? 'transform rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  <div 
                    id={`dropdown-${index}`}
                    className={`mt-2 space-y-1 dropdown-menu border-l-2 border-blue-400 bg-white md:bg-transparent rounded-md mx-2 ${activeDropdown === index ? 'block' : 'hidden'}`}
                  >
                    {item.children.map((child, childIndex) => (
                      <Link
                        key={child.label}
                        to={child.path}
                        className="flex items-center px-3 py-2 rounded-md text-sm font-bold group mobile-dropdown-item"
                        style={{ 
                          color: hoveredItem === `${index}-${childIndex}` ? '#1d4ed8' : '#3b82f6',
                          backgroundColor: hoveredItem === `${index}-${childIndex}` ? '#f3f4f6' : 'white'
                        }}
                        data-hovered={hoveredItem === `${index}-${childIndex}` ? "true" : "false"}
                        onMouseEnter={() => handleItemHover(`${index}-${childIndex}`, true)}
                        onMouseLeave={() => handleItemHover(`${index}-${childIndex}`, false)}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          handleItemHover(`${index}-${childIndex}`, hoveredItem !== `${index}-${childIndex}`);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMobileLinkClick(e);
                        }}
                      >
                        {child.icon && (
                          <span className="mr-2 mobile-dropdown-icon" style={{ color: hoveredItem === `${index}-${childIndex}` ? '#1d4ed8' : '#3b82f6' }}>
                            <MobileIcon icon={child.icon} isHovered={hoveredItem === `${index}-${childIndex}`} />
                          </span>
                        )}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                item.action ? (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      // First close the mobile menu
                      setIsOpen(false);
                      document.body.classList.remove('mobile-menu-open');
                      // Then perform the action
                      item.action(e);
                    }}
                    className={`flex items-center font-bold px-3 py-2 rounded-md text-base w-full nav-item ${item.label === 'Logout' ? 'mt-4 bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    style={{ 
                      backgroundColor: item.label === 'Logout' ? '#dc2626' : '#2563eb',
                      color: 'white'
                    }}
                  >
                    {item.icon && <span className="mr-2">{React.cloneElement(item.icon, { 
                      style: {
                        ...svgStyle,
                        stroke: 'white',
                        color: 'white',
                        fill: 'none'
                      } 
                    })}</span>}
                    <span className="font-bold">{item.label}</span>
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`flex items-center font-bold px-3 py-2 rounded-md text-base nav-item ${item.label === 'Profile' || item.label === 'Admin Dashboard' || item.label === 'Waitlist' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    style={{ backgroundColor: '#2563eb', color: 'white' }}
                    onClick={handleMobileLinkClick}
                  >
                    {item.icon && <span className="mr-2">{React.cloneElement(item.icon, { 
                      style: {
                        ...svgStyle,
                        stroke: 'white',
                        color: 'white',
                        fill: 'none'
                      } 
                    })}</span>}
                    <span className="font-bold">{item.label}</span>
                  </Link>
                )
              )
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;