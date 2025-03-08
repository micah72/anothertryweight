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
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const location = useLocation();
  const { user, isAdmin, isApproved, logout } = useAuth();
  const mobileMenuRef = useRef(null);
  
  // Determine if user is logged in based on auth context
  const isLoggedIn = !!user;
  const userIsAdmin = isAdmin;

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

  // Custom styling for SVG icons
  const svgStyle = {
    stroke: 'white',
    strokeWidth: 2,
    fill: 'none',
    color: 'white',
    pointerEvents: 'none' // Prevent SVG from capturing hover events
  };

  // Define navigation items
  const menuItems = [
    {
      label: 'Home',
      path: '/',
      icon: <Home size={20} />,
      alwaysShow: true,
      hideWhenLoggedIn: false
    },
    {
      label: 'About',
      path: '/about',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>,
      alwaysShow: true,
      hideWhenLoggedIn: true
    },
    {
      label: 'Admin Dashboard',
      path: '/admin-dashboard',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>,
      adminOnly: true,
      requiresAuth: true
    },
    {
      label: 'Stay Healthy',
      path: '/stay-healthy',
      icon: <Activity size={20} />,
      alwaysShow: true,
      hideWhenLoggedIn: true
    },
    {
      label: 'Contact Us',
      path: '/contact',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>,
      alwaysShow: true,
      hideWhenLoggedIn: true
    },
    {
      label: 'Food Gallery',
      path: '/gallery',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>,
      requiresAuth: true
    },
    {
      label: 'Track',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>,
      requiresAuth: true,
      children: [
        { 
          label: 'Analyze Food', 
          path: '/analyze', 
          icon: <Camera size={18} />
        },
        { 
          label: 'Health Metrics', 
          path: '/health', 
          icon: <Activity size={18} />
        },
        { 
          label: 'Goals', 
          path: '/goals', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      ]
    },
    {
      label: 'Kitchen',
      icon: <Utensils size={20} />,
      requiresAuth: true,
      children: [
        { 
          label: 'Scan Contents', 
          path: '/scan', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        },
        { 
          label: 'My Refrigerator', 
          path: '/refrigerator', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      ]
    },
    {
      label: 'Plan',
      icon: <Calendar size={20} />,
      requiresAuth: true,
      children: [
        { 
          label: 'Meal Planner', 
          path: '/meal-planner', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        },
        { 
          label: 'Food Recommendations', 
          path: '/recommendations', 
          icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
        }
      ]
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: <User size={20} />,
      requiresAuth: true
    },
    {
      label: 'Logout',
      action: handleLogout,
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>,
      requiresAuth: true
    },
    {
      label: 'Login',
      path: '/login',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>,
      showWhenLoggedOut: true
    }
  ];

  // Filter menu items based on authentication status
  const filteredMenu = menuItems.filter(item => {
    // Hide items that should be hidden when logged in
    if (isLoggedIn && item.hideWhenLoggedIn) return false;
    
    // Admin can see admin-only items
    if (userIsAdmin && item.adminOnly) return true;
    
    // Show items marked for always showing unless admin and item should hide for admin
    if (item.alwaysShow && (!userIsAdmin || !item.hideWhenAdmin)) return true;
    
    // Show items requiring auth if user is logged in
    if (isLoggedIn && item.requiresAuth && (!item.adminOnly || userIsAdmin)) return true;
    
    // Show items marked for showing when logged out if user is not logged in
    if (!isLoggedIn && item.showWhenLoggedOut) return true;
    
    return false;
  });

  // Close dropdowns when navigation changes
  useEffect(() => {
    setOpenDropdown(null);
    setIsOpen(false);
    document.body.classList.remove('mobile-menu-open');
  }, [location.pathname]);

  // Handle dropdown toggle
  const handleDropdownToggle = (label) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  // Close mobile menu when clicking a link
  const handleMobileLinkClick = () => {
    setIsOpen(false);
    setOpenDropdown(null);
    document.body.classList.remove('mobile-menu-open');
  };

  // Handle click outside mobile menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && isOpen) {
        setIsOpen(false);
        document.body.classList.remove('mobile-menu-open');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Add a small delay to make sure state updates properly before toggling classes
    setTimeout(() => {
      if (newIsOpen) {
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.classList.remove('mobile-menu-open');
      }
    }, 10);
  };

  // Add class to body when user is admin
  useEffect(() => {
    if (user && user.email === 'admin@example.com') {
      document.body.classList.add('admin-body');
    } else {
      document.body.classList.remove('admin-body');
    }
    
    return () => {
      document.body.classList.remove('admin-body');
    };
  }, [user]);

  return (
    <nav className="bg-blue-500 safe-area-top w-full sticky top-0 z-50 nav-container">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-16 border-none">
          {/* Logo and brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-white text-lg sm:text-xl font-bold site-logo">
              SnapLicious AI
            </Link>
            {isLoggedIn && userIsAdmin && (
              <span className="ml-2 bg-yellow-400 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                Admin
              </span>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:justify-between md:flex-1 md:ml-4">
            {/* Main navigation items */}
            <div className="flex items-center space-x-1 lg:space-x-2">
              {filteredMenu
                .filter(item => item.label !== 'Logout')
                .map((item) => (
                  <div key={item.label} className="relative">
                    {item.children ? (
                      <div className="relative">
                        <button
                          onClick={() => handleDropdownToggle(item.label)}
                          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none ${openDropdown === item.label ? 'bg-blue-700' : ''}`}
                          aria-expanded={openDropdown === item.label}
                          aria-controls={`dropdown-${item.label}`}
                          aria-haspopup="true"
                        >
                          <span className="mr-1.5">
                            {React.cloneElement(item.icon, { style: svgStyle })}
                          </span>
                          <span className="inline-block font-bold">{item.label}</span>
                          <ChevronDown 
                            className={`ml-1 h-4 w-4 transition-transform ${openDropdown === item.label ? 'transform rotate-180' : ''}`} 
                            style={svgStyle}
                          />
                        </button>
                        
                        {/* Dropdown content */}
                        {openDropdown === item.label && (
                          <div 
                            className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-blue-500 z-50"
                            style={{ 
                              display: 'block',
                              boxShadow: '0 10px 15px rgba(0, 0, 0, 0.2)',
                              border: 'none'
                            }}
                          >
                            <div className="py-1">
                              {item.children.map(child => (
                                <Link
                                  key={child.label}
                                  to={child.path}
                                  className="flex items-center px-4 py-2 text-sm text-white hover:bg-blue-600 whitespace-nowrap"
                                  onClick={handleMobileLinkClick}
                                >
                                  <span className="mr-2">
                                    {React.cloneElement(child.icon, { style: svgStyle })}
                                  </span>
                                  <span className="text-white font-medium whitespace-nowrap">{child.label.length > 15 ? child.label : child.label}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      item.action ? (
                        <button
                          onClick={item.action}
                          className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
                        >
                          <span className="mr-1.5">
                            {React.cloneElement(item.icon, { style: svgStyle })}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ) : (
                        <Link
                          to={item.path}
                          className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <span className="mr-1.5">
                            {React.cloneElement(item.icon, { style: svgStyle })}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      )
                    )}
                  </div>
                ))}
            </div>
            
            {/* Logout button */}
            <div className="ml-2">
              {filteredMenu
                .filter(item => item.label === 'Logout')
                .map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                  >
                    <span className="mr-1.5">
                      {React.cloneElement(item.icon, { style: svgStyle })}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="mobile-menu-btn text-white hover:text-gray-200 focus:outline-none md:hidden"
            aria-label="Open menu"
            style={{ background: 'transparent', border: 'none' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={`mobile-menu fixed inset-y-0 right-0 z-50 ${isOpen ? 'open' : ''}`}
        style={{
          maxHeight: '100vh',
          overflowY: 'auto',
          zIndex: 9999
        }}
        ref={mobileMenuRef}
      >
        {/* Close button */}
        <div>
          <button
            className="mobile-menu-close"
            onClick={toggleMobileMenu}
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        {/* Mobile menu content */}
        <div className="px-2 pt-2 pb-3 space-y-1">
          {filteredMenu.map((item) => (
            <div key={item.label} className="w-full">
              {item.children ? (
                <div className="w-full">
                  <button
                    onClick={() => handleDropdownToggle(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-md text-base font-medium text-white hover:bg-blue-700 focus:outline-none ${openDropdown === item.label ? 'bg-blue-700' : ''}`}
                    aria-expanded={openDropdown === item.label}
                    aria-controls={`dropdown-${item.label}`}
                    aria-haspopup="true"
                  >
                    <div className="flex items-center">
                      <span className="mr-3">
                        {React.cloneElement(item.icon, { style: svgStyle })}
                      </span>
                      <span className="font-bold text-white">{item.label}</span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 transform transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  
                  <div className={`mobile-dropdown ml-6 ${openDropdown === item.label ? 'open' : ''}`}>
                    {item.children.map(child => (
                      <Link
                        key={child.label}
                        to={child.path}
                        className="flex items-center pl-8 pr-3 py-3 text-base font-medium text-white hover:bg-blue-800"
                        onClick={handleMobileLinkClick}
                      >
                        <span className="mr-3">
                          {React.cloneElement(child.icon, { style: svgStyle })}
                        </span>
                        <span className="text-white font-medium whitespace-nowrap">{child.label.length > 15 ? child.label : child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                item.action ? (
                  <button
                    onClick={(e) => {
                      handleMobileLinkClick();
                      item.action(e);
                    }}
                    className={`w-full flex items-center px-3 py-3 rounded-md text-base font-medium 
                      ${item.label === 'Logout' ? 'text-white bg-red-600 hover:bg-red-700' : 'text-white hover:bg-blue-700'}`}
                  >
                    <span className="mr-3">
                      {React.cloneElement(item.icon, { style: svgStyle })}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    className="flex items-center px-3 py-3 rounded-md text-base font-medium text-white hover:bg-blue-700"
                    onClick={handleMobileLinkClick}
                  >
                    <span className="mr-3">
                      {React.cloneElement(item.icon, { style: svgStyle })}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        ></div>
      )}
      
      {/* iOS/Safari specific fixes */}
      <style>{`
        @supports (-webkit-touch-callout: none) {
          /* iOS specific styles */
          .mobile-menu-open {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
            -webkit-overflow-scrolling: auto;
          }
        }
        
        /* iPad specific styles */
        @media only screen and (min-device-width: 768px) and (max-device-width: 1024px) {
          .mobile-menu-button {
            -webkit-tap-highlight-color: transparent;
          }
        }

        /* Mobile header background fixes */
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
          background-color: #3d7fef !important;
          box-shadow: none !important;
          border-bottom: none !important;
        }

        /* This makes all child elements of the header inherit the blue background */
        .safe-area-top > * {
          background-color: #3d7fef !important;
        }

        /* Fix for iOS status bar */
        @supports (-webkit-touch-callout: none) {
          /* iOS only */
          .safe-area-top {
            padding-top: env(safe-area-inset-top);
          }
        }

        /* Remove any white dividers or borders in the header area */
        .header-container hr,
        .header-container .divider,
        .nav-container::after,
        .nav-container::before {
          display: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Ensure no border or line appears below the header */
        .nav-container {
          border-bottom: none !important;
          box-shadow: none !important;
        }
        
        /* Remove any borders from direct children */
        .nav-container > div {
          border-bottom: none !important;
        }
      `}</style>
    </nav>
  );
};

export default Navigation;