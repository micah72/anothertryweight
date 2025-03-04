import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSafari, setIsSafari] = useState(false);
  const [isIPad, setIsIPad] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');

  // Detect Safari, iPad, and iPhone on component mount
  useEffect(() => {
    // Safari detection
    const isSafariCheck = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setIsSafari(isSafariCheck);
    
    // Chrome detection
    const isChromeCheck = /chrome|chromium|crios/i.test(navigator.userAgent);
    setIsChrome(isChromeCheck && !isSafariCheck); // Ensure it's Chrome and not Safari
    
    // iPad detection - check for iPad specifically or tablet-like dimensions
    const isIPadCheck = /iPad/i.test(navigator.userAgent) || 
      (navigator.maxTouchPoints && 
       navigator.maxTouchPoints > 2 && 
       /MacIntel/.test(navigator.platform));
    setIsIPad(isIPadCheck);
    
    // iPhone detection
    const isIPhoneCheck = /iPhone|iPod/i.test(navigator.userAgent);
    setIsIPhone(isIPhoneCheck);
    
    // Handle orientation changes
    const handleResize = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      if (orientation !== newOrientation) {
        setOrientation(newOrientation);
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [orientation]);

  const foodItems = [
    {
      id: 1,
      title: 'Grilled Salmon',
      description: 'Fresh salmon with vegetables',
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      calories: 320,
      protein: '22g',
    },
    {
      id: 2,
      title: 'Mediterranean Bowl',
      description: 'Quinoa, chickpeas, and veggies',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      calories: 420,
      protein: '15g',
    },
    {
      id: 3,
      title: 'Steak & Vegetables',
      description: 'Grass-fed steak with roasted vegetables',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      calories: 520,
      protein: '28g',
    },
    {
      id: 4,
      title: 'Berry Smoothie Bowl',
      description: 'Antioxidant-rich berries with chia',
      image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      calories: 280,
      protein: '8g',
    },
    {
      id: 5,
      title: 'Avocado Toast',
      description: 'Whole grain toast with fresh avocado',
      image: 'https://images.pexels.com/photos/1351238/pexels-photo-1351238.jpeg?auto=compress&cs=tinysrgb&w=1200',
      calories: 240,
      protein: '6g',
    },
    {
      id: 6,
      title: 'Chicken Caesar Salad',
      description: 'Grilled chicken with fresh romaine',
      image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      calories: 380,
      protein: '24g',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Save the email to Firebase
      await addDoc(collection(db, 'waitlist'), {
        email: email,
        timestamp: serverTimestamp(),
        status: 'pending' // You can use this to track status (pending, contacted, etc.)
      });
      
      setIsSubmitted(true);
      setEmail('');
    } catch (error) {
      console.error('Error adding email to waitlist:', error);
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Device-specific class adjustments
  const safariFlexClass = isSafari ? 'safari-flex-fix' : '';
  const ipadTouchClass = isIPad ? 'ipad-touch-fix' : '';
  const iphoneTouchClass = isIPhone ? 'iphone-touch-fix' : '';
  const orientationClass = isIPad ? (orientation === 'landscape' ? 'ipad-landscape-fix' : 'ipad-portrait-fix') : 
                           isIPhone ? (orientation === 'landscape' ? 'iphone-landscape-fix' : 'iphone-portrait-fix') : '';
  const browserClass = isSafari ? 'safari-spacing' : isChrome ? 'chrome-spacing' : '';
  const deviceClass = isIPad ? 'ipad-device' : isIPhone ? 'iphone-device' : '';

  return (
    <div className="overflow-x-hidden w-full">
      {/* Hero Section */}
      <section className={`bg-gradient-to-r from-blue-500 to-blue-700 w-full ${ipadTouchClass} ${iphoneTouchClass} safe-padding-top hero-section ${browserClass}`} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0) + 40px)' }}>
        <div className="container mx-auto px-4 safe-padding-left safe-padding-right">
          <div className={`flex flex-col md:flex-row items-center justify-between gap-8 ${safariFlexClass}`}>
            <div className="w-full md:max-w-xl lg:max-w-2xl mb-8 md:mb-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                Snap. Analyze. Plan.<br />Eat Smarter.
              </h1>
              
              <p className="text-blue-100 text-base sm:text-lg mb-6 sm:mb-8">
                SnapLicious AI is a comprehensive health and meal planning app that leverages the power of photography and artificial intelligence to transform the way you manage your diet.
              </p>

              <form onSubmit={handleSubmit} className="mb-6 sm:mb-8">
                <div className={`flex flex-col sm:flex-row gap-3 ${safariFlexClass}`}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email..."
                    className="flex-grow px-4 py-3 rounded-lg bg-white/10 border border-blue-300 text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent appearance-none"
                    required
                    disabled={isLoading}
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    className={`px-6 py-3 rounded-lg bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${ipadTouchClass} ${iphoneTouchClass}`}
                    disabled={isLoading}
                    style={{
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {isLoading ? (
                      <span className={`flex items-center ${safariFlexClass}`}>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Joining...
                      </span>
                    ) : (
                      'Join The Waitlist'
                    )}
                  </button>
                </div>
                {error && (
                  <div className="text-red-200 mt-2 text-sm">
                    {error}
                  </div>
                )}
              </form>

              {isSubmitted && (
                <div className="text-white bg-blue-600/30 px-4 py-3 rounded-lg mb-6 fade-in">
                  Thanks for joining! We'll notify you when we launch.
                </div>
              )}

              <div className="text-blue-100">
                Join the <span className="font-medium text-white">2,000+</span> members who have already signed up
              </div>
            </div>
            
            <div className="w-full sm:w-3/4 md:w-1/2 lg:max-w-md mx-auto md:mx-0">
              <div className="bg-white rounded-lg shadow-xl overflow-hidden hardware-accelerated">
                <img 
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Beautiful food arrangement" 
                  className="w-full h-48 sm:h-64 object-cover"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Food Grid Section */}
      <section className="py-12 sm:py-16 bg-gray-50 w-full">
        <div className="container mx-auto px-4 safe-padding-left safe-padding-right">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Healthy Meal Options</h2>
            <p className="text-gray-600 max-w-2xl mx-auto px-2">
              Discover delicious and nutritious meals that fit your diet plan. SnapLicious AI helps you track nutrition and maintain a healthy lifestyle with just a photo.
            </p>
          </div>

          <div className={`food-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 ${isIPad ? 'ipad-grid' : isIPhone ? 'iphone-grid' : ''}`}>
            {foodItems.map((food) => (
              <div key={food.id} className={`food-card rounded-lg overflow-hidden shadow-lg bg-white ${isIPad ? 'ipad-card' : isIPhone ? 'iphone-card' : ''}`}>
                <div className="h-40 sm:h-48 overflow-hidden">
                  <img 
                    src={food.image} 
                    alt={food.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 12rem)', minHeight: '160px' }}>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">{food.title}</h3>
                  <p className="text-gray-600 mb-4">{food.description}</p>
                  <div className="nutrition-wrapper flex justify-between items-center mt-auto" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    width: '100%', 
                    marginTop: 'auto',
                    paddingTop: '8px'
                  }}>
                    <span 
                      className="nutrition-item bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                      style={{ 
                        backgroundColor: '#eff6ff', 
                        color: '#1d4ed8', 
                        borderRadius: '9999px',
                        padding: '0.25rem 0.75rem',
                        display: 'inline-block',
                        maxWidth: '45%',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {food.calories} calories
                    </span>
                    <span 
                      className="nutrition-item bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm"
                      style={{ 
                        backgroundColor: '#f0fdf4', 
                        color: '#15803d', 
                        borderRadius: '9999px',
                        padding: '0.25rem 0.75rem',
                        display: 'inline-block',
                        maxWidth: '45%',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {food.protein} protein
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-white w-full">
        <div className="container mx-auto px-4 safe-padding-left safe-padding-right">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Why Choose SnapLicious AI</h2>
            <p className="text-gray-600 max-w-2xl mx-auto px-2">
              Our AI-powered app is designed to make meal planning, nutrition tracking, and inventory management simple, effective, and personalized to your unique needs.
            </p>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-4 ${safariFlexClass} ${isIPad ? 'ipad-features-grid' : isIPhone ? 'iphone-features-grid' : ''}`}>
            <div className={`p-4 sm:p-6 bg-blue-50 rounded-lg hardware-accelerated feature-card ${ipadTouchClass} ${iphoneTouchClass}`}
                 style={{
                   WebkitTransform: 'translate3d(0, 0, 0)',
                   transform: 'translate3d(0, 0, 0)',
                   WebkitBackfaceVisibility: 'hidden',
                   backfaceVisibility: 'hidden'
                 }}>
              <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white mb-4 mx-auto ${safariFlexClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900 text-center">Capture & Analyze</h3>
              <p className="text-gray-600 text-sm sm:text-base text-center">Simply snap photos of your meals to automatically log nutritional information such as calorie content and health scores.</p>
            </div>

            <div className={`p-4 sm:p-6 bg-blue-50 rounded-lg hardware-accelerated feature-card ${ipadTouchClass} ${iphoneTouchClass}`}
                 style={{
                   WebkitTransform: 'translate3d(0, 0, 0)',
                   transform: 'translate3d(0, 0, 0)',
                   WebkitBackfaceVisibility: 'hidden',
                   backfaceVisibility: 'hidden'
                 }}>
              <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white mb-4 mx-auto ${safariFlexClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900 text-center">Inventory Tracking</h3>
              <p className="text-gray-600 text-sm sm:text-base text-center">Keep an organized record of what's in your refrigerator, ensuring you always know what ingredients you have on hand.</p>
            </div>

            <div className={`p-4 sm:p-6 bg-blue-50 rounded-lg hardware-accelerated feature-card ${ipadTouchClass} ${iphoneTouchClass}`}
                 style={{
                   WebkitTransform: 'translate3d(0, 0, 0)',
                   transform: 'translate3d(0, 0, 0)',
                   WebkitBackfaceVisibility: 'hidden',
                   backfaceVisibility: 'hidden'
                 }}>
              <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white mb-4 mx-auto ${safariFlexClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900 text-center">Recipe Generation</h3>
              <p className="text-gray-600 text-sm sm:text-base text-center">Get smart recipe suggestions based on your current inventory, making meal planning both creative and efficient.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12 w-full safe-padding-bottom">
        <div className="container mx-auto px-4 safe-padding-left safe-padding-right">
          <div className={`flex flex-col md:flex-row justify-between items-center ${safariFlexClass}`}>
            <div className="mb-6 md:mb-0">
              <h2 className="text-xl sm:text-2xl font-bold">SnapLicious AI</h2>
              <p className="text-gray-400 mt-2">Snap, Analyze, Plan</p>
            </div>

            <div className={`flex flex-wrap justify-center gap-4 sm:gap-6 ${safariFlexClass}`}>
              <Link to="/" className="hover:text-blue-400 transition-colors">Home</Link>
              <Link to="/admin/login" className="hover:text-blue-400 transition-colors">Admin</Link>
              <a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} SnapLicious AI. All rights reserved.</p>
            <p className="mt-2 text-xs sm:text-sm">*AI Forward: Leveraging cutting-edge artificial intelligence to provide smarter health insights through photography and meal planning.</p>
          </div>
        </div>
      </footer>

      {/* Device specific CSS */}
      <style jsx>{`
        /* Food grid and card styling for all devices */
        .food-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1.5rem;
          width: 100%;
        }
        
        /* Add more space to the top of the app */
        .hero-section {
          padding-top: calc(env(safe-area-inset-top, 0) + 40px) !important;
        }
        
        /* Even more space for iPhones and smaller devices */
        @media only screen and (max-width: 428px) {
          .hero-section {
            padding-top: calc(env(safe-area-inset-top, 0) + 50px) !important;
          }
        }
        
        @media (min-width: 640px) {
          .food-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1024px) {
          .food-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        .food-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: white;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .nutrition-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-top: auto;
        }
        
        .nutrition-item {
          display: inline-block;
          border-radius: 9999px;
          padding: 0.25rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
        
        /* Nutrition info styling for all browsers */
        .bg-blue-50 {
          background-color: #eff6ff !important;
        }
        
        .text-blue-700 {
          color: #1d4ed8 !important;
        }
        
        .bg-green-50 {
          background-color: #f0fdf4 !important;
        }
        
        .text-green-700 {
          color: #15803d !important;
        }
        
        .rounded-full {
          border-radius: 9999px !important;
        }
        
        /* Safari flexbox fixes */
        .safari-flex-fix {
          display: -webkit-box;
          display: -webkit-flex;
          display: flex;
          -webkit-box-align: center;
          -webkit-align-items: center;
        }
        
        /* iPad specific fixes */
        @media only screen and (min-device-width: 768px) and (max-device-width: 1024px) {
          /* Add extra padding to the body to account for fixed header */
          body {
            padding-top: 60px !important;
          }
          
          /* iPad grid layouts */
          .ipad-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          
          /* iPad landscape mode */
          @media (orientation: landscape) {
            .ipad-grid {
              grid-template-columns: repeat(3, 1fr) !important;
            }
            
            .ipad-landscape-fix {
              padding-top: 80px !important;
            }
          }
          
          /* iPad portrait mode */
          @media (orientation: portrait) {
            .ipad-portrait-fix {
              padding-top: 80px !important;
            }
          }
          
          /* Better tapping for iPad */
          .ipad-touch-fix {
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Better card handling */
          .ipad-card {
            min-height: 360px !important;
          }
          
          /* Features grid for iPad */
          .ipad-features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        /* iPhone specific fixes */
        @media only screen and (max-width: 428px) {
          /* iPhone grid layouts */
          .iphone-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          /* Additional top spacing for iPhone */
          body {
            padding-top: 20px !important; /* Base padding for all iPhone screens */
          }
          
          /* iPhone landscape mode */
          @media (orientation: landscape) {
            .iphone-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            
            .iphone-landscape-fix {
              padding-top: 60px !important;
            }
          }
          
          /* iPhone portrait mode */
          @media (orientation: portrait) {
            .iphone-portrait-fix {
              padding-top: 60px !important;
            }
            
            /* Extra space for the notch area on newer iPhones */
            .hero-section {
              padding-top: calc(env(safe-area-inset-top, 20px) + 60px) !important;
            }
          }
          
          /* Better tapping for iPhone */
          .iphone-touch-fix {
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            min-height: 44px; /* Apple's recommendation for touch targets */
          }
          
          /* Better card handling */
          .iphone-card {
            min-height: 340px !important;
          }
          
          /* Features grid for iPhone */
          .iphone-features-grid {
            grid-template-columns: 1fr !important;
          }
          
          /* Better form controls for iPhone */
          input[type="email"],
          button[type="submit"] {
            font-size: 16px !important; /* Prevents zoom on iPhone */
            padding: 12px 16px !important;
            border-radius: 8px !important;
          }
        }
        
        /* Handle iOS safe areas for notched devices */
        @supports (padding-top: env(safe-area-inset-top)) {
          .safe-padding-top {
            padding-top: env(safe-area-inset-top, 0);
          }
          
          /* Enhanced safe area handling for hero section */
          .hero-section.safe-padding-top {
            padding-top: calc(env(safe-area-inset-top, 20px) + 40px) !important;
          }
          
          /* Ensure notch area is always handled properly */
          @media only screen and (max-width: 428px) {
            .hero-section.safe-padding-top {
              padding-top: calc(env(safe-area-inset-top, 20px) + 60px) !important;
            }
          }
          
          .safe-padding-bottom {
            padding-bottom: env(safe-area-inset-bottom, 0);
          }
          
          .safe-padding-left {
            padding-left: env(safe-area-inset-left, 1rem);
          }
          
          .safe-padding-right {
            padding-right: env(safe-area-inset-right, 1rem);
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
