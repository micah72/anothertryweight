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
  const [isChrome, setIsChrome] = useState(false);
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');

  // Detect Safari and iPad on component mount
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

  // Safari-specific class adjustments
  const safariFlexClass = isSafari ? 'safari-flex-fix' : '';
  const ipadTouchClass = isIPad ? 'ipad-touch-fix' : '';
  const orientationClass = isIPad ? (orientation === 'landscape' ? 'ipad-pro-landscape-fix' : 'ipad-pro-portrait-fix') : '';
  const browserClass = isSafari ? 'safari-spacing' : isChrome ? 'chrome-spacing' : '';

  return (
    <div className={`w-full bg-white ${orientationClass}`}>
      {/* Hero Section */}
      <section className={`bg-gradient-to-r from-blue-500 to-blue-700 w-full ${ipadTouchClass} safe-padding-top hero-section ${browserClass}`}>
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
                    className={`px-6 py-3 rounded-lg bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${ipadTouchClass}`}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {foodItems.map((food) => (
              <div key={food.id} className="rounded-lg overflow-hidden shadow-lg bg-white">
                <div className="h-40 sm:h-48 overflow-hidden">
                  <img 
                    src={food.image} 
                    alt={food.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">{food.title}</h3>
                  <p className="text-gray-600 mb-4">{food.description}</p>
                  <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span 
                      className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                      style={{ 
                        backgroundColor: '#eff6ff', 
                        color: '#1d4ed8', 
                        borderRadius: '9999px',
                        padding: '0.25rem 0.75rem',
                        display: 'inline-block'
                      }}
                    >
                      {food.calories} calories
                    </span>
                    <span 
                      className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm"
                      style={{ 
                        backgroundColor: '#f0fdf4', 
                        color: '#15803d', 
                        borderRadius: '9999px',
                        padding: '0.25rem 0.75rem',
                        display: 'inline-block'
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

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 ${safariFlexClass}`}>
            <div className={`p-4 sm:p-6 bg-blue-50 rounded-lg hardware-accelerated ${ipadTouchClass}`}
                 style={{
                   WebkitTransform: 'translate3d(0, 0, 0)',
                   transform: 'translate3d(0, 0, 0)',
                   WebkitBackfaceVisibility: 'hidden',
                   backfaceVisibility: 'hidden'
                 }}>
              <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white mb-4 ${safariFlexClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">Capture & Analyze</h3>
              <p className="text-gray-600 text-sm sm:text-base">Simply snap photos of your meals to automatically log nutritional information such as calorie content and health scores.</p>
            </div>

            <div className={`p-4 sm:p-6 bg-blue-50 rounded-lg hardware-accelerated ${ipadTouchClass}`}
                 style={{
                   WebkitTransform: 'translate3d(0, 0, 0)',
                   transform: 'translate3d(0, 0, 0)',
                   WebkitBackfaceVisibility: 'hidden',
                   backfaceVisibility: 'hidden'
                 }}>
              <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white mb-4 ${safariFlexClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">Inventory Tracking</h3>
              <p className="text-gray-600 text-sm sm:text-base">Keep an organized record of what's in your refrigerator, ensuring you always know what ingredients you have on hand.</p>
            </div>

            <div className={`p-4 sm:p-6 bg-blue-50 rounded-lg hardware-accelerated ${ipadTouchClass}`}
                 style={{
                   WebkitTransform: 'translate3d(0, 0, 0)',
                   transform: 'translate3d(0, 0, 0)',
                   WebkitBackfaceVisibility: 'hidden',
                   backfaceVisibility: 'hidden'
                 }}>
              <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white mb-4 ${safariFlexClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">Recipe Generation</h3>
              <p className="text-gray-600 text-sm sm:text-base">Get smart recipe suggestions based on your current inventory, making meal planning both creative and efficient.</p>
            </div>

            <div className={`p-4 sm:p-6 bg-blue-50 rounded-lg hardware-accelerated ${ipadTouchClass}`}
                 style={{
                   WebkitTransform: 'translate3d(0, 0, 0)',
                   transform: 'translate3d(0, 0, 0)',
                   WebkitBackfaceVisibility: 'hidden',
                   backfaceVisibility: 'hidden'
                 }}>
              <div className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white mb-4 ${safariFlexClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">Personalized Planning</h3>
              <p className="text-gray-600 text-sm sm:text-base">Benefit from AI-driven insights that help you plan balanced meals and monitor your dietary goals with a visual food journal.</p>
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

      {/* Safari and iPad specific CSS */}
      <style jsx>{`
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
        
        /* iPad touch optimizations */
        .ipad-touch-fix {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Fix for Safari transitions */
        @supports (-webkit-touch-callout: none) {
          .transition-transform {
            -webkit-transition: -webkit-transform 0.3s ease;
            transition: -webkit-transform 0.3s ease;
          }
          
          .hover\:-translate-y-2:hover {
            -webkit-transform: translateY(-0.5rem);
            transform: translateY(-0.5rem);
          }
        }
        
        /* Fix for Safari image transitions */
        @supports (-webkit-touch-callout: none) {
          .hover\:scale-110:hover {
            -webkit-transform: scale(1.1);
            transform: scale(1.1);
          }
        }
        
        /* Fade-in animation for Safari */
        .fade-in {
          -webkit-animation: fadeIn 0.5s ease-in;
          animation: fadeIn 0.5s ease-in;
        }
        
        @-webkit-keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Browser-specific adjustments */
        .safari-spacing {
          /* Safari already has the correct spacing, so we keep it as is */
        }
        
        .chrome-spacing {
          /* Chrome-specific adjustments are now in global.css */
        }
        
        /* Safari-specific grid fixes */
        @supports (-webkit-touch-callout: none) {
          .grid {
            display: -webkit-box;
            display: -webkit-flex;
            display: flex;
            -webkit-flex-wrap: wrap;
            flex-wrap: wrap;
            margin: -0.5rem;
          }
          
          .grid-cols-1 {
            -webkit-box-orient: vertical;
            -webkit-box-direction: normal;
            -webkit-flex-direction: column;
            flex-direction: column;
          }
          
          .grid-cols-1 > * {
            width: 100%;
            margin: 0.5rem;
            -webkit-box-flex: 0;
            -webkit-flex: 0 0 auto;
            flex: 0 0 auto;
          }
          
          .sm\:grid-cols-2 {
            -webkit-flex-direction: row;
            flex-direction: row;
          }
          
          .sm\:grid-cols-2 > * {
            width: calc(50% - 1rem);
            margin: 0.5rem;
            -webkit-box-flex: 0;
            -webkit-flex: 0 0 auto;
            flex: 0 0 auto;
          }
          
          .lg\:grid-cols-3 > * {
            width: calc(33.333% - 1rem);
            margin: 0.5rem;
            -webkit-box-flex: 0;
            -webkit-flex: 0 0 auto;
            flex: 0 0 auto;
          }
          
          /* Fix for Safari card layout */
          @media (max-width: 639px) {
            .grid-cols-1 > * {
              width: 100%;
            }
          }
          
          @media (min-width: 640px) and (max-width: 1023px) {
            .sm\:grid-cols-2 > * {
              width: calc(50% - 1rem);
            }
          }
          
          @media (min-width: 1024px) {
            .lg\:grid-cols-3 > * {
              width: calc(33.333% - 1rem);
            }
          }
        }
        
        /* iPad orientation specific styles */
        @media screen and (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
          .ipad-portrait-specific {
            padding: 0 5%;
          }
        }
        
        @media screen and (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
          .ipad-landscape-specific {
            padding: 0 10%;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
