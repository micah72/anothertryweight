import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { CheckCircle2 } from 'lucide-react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

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
  const [successMessage, setSuccessMessage] = useState('Thank you for joining our waitlist!');

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
      console.log('Adding email to waitlist:', email);
      
      // Save the email to Firebase
      const docRef = await addDoc(collection(db, 'waitlist'), {
        email: email,
        timestamp: serverTimestamp(),
        status: 'pending', // You can use this to track status (pending, contacted, etc.)
        createdAt: new Date() // Add a regular Date object as backup
      });
      
      console.log('Document written with ID: ', docRef.id);
      setIsSubmitted(true);
      
      // Now generate a temporary password for testing purposes
      const tempPassword = generateSimplePassword();
      
      try {
        // Create a Firebase Auth account for this user so they can login immediately
        // This bypasses the normal admin approval process for testing
        await createUserWithEmailAndPassword(auth, email, tempPassword);
        
        // Add to approved_users collection
        await setDoc(doc(db, 'approved_users', auth.currentUser.uid), {
          email: email,
          approvedAt: new Date(),
          waitlistId: docRef.id,
          isApproved: true,
          tempPassword: tempPassword,
          passwordCreatedAt: new Date().toISOString()
        });
        
        // Add to users collection
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          email: email,
          created_at: new Date(),
          updated_at: new Date(),
          role: 'regular',
          isApproved: true,
          tempPassword: tempPassword,
          passwordCreatedAt: new Date().toISOString()
        });
        
        // Update waitlist entry
        await updateDoc(doc(db, 'waitlist', docRef.id), {
          status: 'registered',
          approvedAt: new Date(),
          registeredAt: new Date(),
          uid: auth.currentUser.uid,
          tempPassword: tempPassword,
          lastUsedPassword: tempPassword,
          passwordCreatedAt: new Date().toISOString()
        });
        
        // Sign out so user can login with their credentials
        await signOut(auth);
        
        // Update success message to include the password
        setSuccessMessage(`Thank you for joining our waitlist! For testing purposes, you can log in immediately with your email and this temporary password: ${tempPassword}`);
      } catch (authError) {
        console.error('Error creating test user account:', authError);
        // Still show success for waitlist sign-up
        setSuccessMessage('Thank you for joining our waitlist! An administrator will approve your account soon.');
      }
      
      setEmail('');
    } catch (error) {
      console.error('Error adding email to waitlist:', error);
      setError(`Failed to join waitlist: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate a simple password that meets Firebase requirements
  const generateSimplePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    
    // Generate at least 8 characters
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure we have at least one number and one uppercase letter for Firebase requirements
    password += 'A1';
    
    return password;
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
    <div className="overflow-x-hidden w-full min-h-screen" style={{ backgroundColor: '#3d7fef', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section className="w-full py-12 sm:py-16 md:py-20 lg:py-24" style={{ backgroundColor: '#3d7fef' }}>
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="order-2 md:order-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Snap. Analyze. Plan.<br />Eat Smarter.
              </h1>
              
              <p className="text-blue-100 text-lg md:text-xl mb-8 max-w-xl">
                SnapLicious AI is a comprehensive health and meal planning app that leverages the power of photography and artificial intelligence to transform the way you manage your diet.
              </p>

              <form onSubmit={handleSubmit} className="mb-8">
                <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email..."
                    className="flex-grow px-4 py-3 rounded-lg bg-white/10 border border-blue-300 text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                    required
                    disabled={isLoading}
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    className={`px-6 py-3 rounded-lg bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    disabled={isLoading}
                    style={{
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
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
                <div className="bg-green-50 p-4 rounded-lg shadow mb-8 max-w-md">
                  <h3 className="text-xl font-bold text-green-800 mb-2 flex items-center">
                    <CheckCircle2 className="mr-2" size={24} />
                    Success!
                  </h3>
                  <p className="text-green-700">{successMessage}</p>
                </div>
              )}

              <div className="text-blue-100 text-lg">
                <span className="font-medium text-white">Join now</span> and take control of your health from day one!
              </div>
            </div>
            
            {/* Image */}
            <div className="order-1 md:order-2 flex justify-center md:justify-end">
              <div className="w-full max-w-md lg:max-w-lg relative">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-transform hover:scale-[1.02] duration-300">
                  <img 
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                    alt="Beautiful food arrangement" 
                    className="w-full h-64 sm:h-72 md:h-80 lg:h-96 object-cover"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none"></div>
                </div>
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

      {/* Device specific CSS */}
      <style>{`
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

        /* Mobile-specific fixes for the landing page */
        .landing-container {
          background-color: #3d7fef;
        }

        /* Ensure the header extends to the top of the screen on mobile */
        .landing-header {
          padding-top: env(safe-area-inset-top);
          background-color: #3d7fef !important;
          margin-top: -1px; /* Fix small gap sometimes seen on mobile */
        }

        /* Remove any white borders or dividers */
        .landing-header div {
          border: none !important;
        }
        
        /* Critical fixes for the landing page */
        html, body, #root {
          background-color: #3d7fef !important;
          min-height: 100vh !important;
          min-height: -webkit-fill-available !important;
          overflow-x: hidden !important;
          width: 100% !important;
          position: relative !important;
        }
        
        /* Ensure the background color extends through the entire page */
        html::after,
        body::after,
        #root::after,
        .overflow-x-hidden::after {
          content: "" !important;
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          height: 100vh !important;
          z-index: -1 !important;
          background-color: #3d7fef !important;
        }

        /* Media query for mobile devices */
        @media (max-width: 767px) {
          .landing-page {
            background-color: #3d7fef !important;
            min-height: 100vh !important;
          }
          
          /* Fix for iPhone notch area */
          .notch-area-fix {
            background-color: #3d7fef !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: env(safe-area-inset-top) !important;
            z-index: 9999 !important;
          }
          
          /* Fix for white bar at bottom */
          body::after {
            content: "" !important;
            display: block !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: max(env(safe-area-inset-bottom, 20px), 20px) !important;
            background-color: #3d7fef !important;
            z-index: 9998 !important;
          }
          
          /* Make sure the page fills the entire viewport */
          #root, .overflow-x-hidden {
            min-height: 100vh !important;
            min-height: -webkit-fill-available !important;
            background-color: #3d7fef !important;
          }
          
          /* Ensure the content doesn't end prematurely */
          .overflow-x-hidden::after {
            content: "" !important;
            display: block !important;
            min-height: 50px !important;
            background-color: #3d7fef !important;
          }
        }
      `}</style>

      {/* Adding iPad-specific menu fixes with hamburger menu */}
      <style>{`
        /* iPad-specific navigation fixes with hamburger menu */
        @media only screen and (min-width: 768px) and (max-width: 1112px) {
          /* Hide desktop menu on iPad */
          nav .hidden.md\\:flex {
            display: none !important;
          }
          
          /* Show mobile menu button on iPad */
          nav .hidden.md\\:hidden {
            display: flex !important;
          }
          
          /* Create a semi-transparent overlay for the entire screen when menu is open */
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0);
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
            z-index: 40;
            pointer-events: none;
            transition: all 0.3s ease;
          }
          
          /* When menu is open, darken the overlay and enable pointer events */
          body.menu-open::before {
            background: rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(1px);
            -webkit-backdrop-filter: blur(1px);
            pointer-events: auto;
          }
          
          /* Improved mobile menu styling */
          nav .mobile-menu {
            display: block;
            position: fixed;
            top: 0;
            right: 0;
            width: 300px;
            height: 100vh;
            background: linear-gradient(to right, rgba(61, 127, 239, 0.3), rgba(61, 127, 239, 0.5)); /* Gradient for better depth */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 50;
            transform: translateX(100%);
            transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1); /* Smoother animation */
            padding-top: calc(env(safe-area-inset-top) + 20px);
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            border-left: 1px solid rgba(255, 255, 255, 0.3);
          }
          
          /* Add a semi-transparent vertical stripe to the menu for better visual hierarchy */
          nav .mobile-menu::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 60px;
            height: 100%;
            background: linear-gradient(to right, rgba(61, 127, 239, 0.2), transparent);
            z-index: -1;
            pointer-events: none;
          }
          
          /* Add spacing at the top of the menu for the close button */
          nav .mobile-menu::before {
            content: '';
            display: block;
            height: 60px;
          }
          
          /* Animation for open menu */
          nav .mobile-menu.open {
            transform: translateX(0);
          }
          
          /* Style the hamburger menu button */
          nav .md\\:hidden button {
            display: flex !important;
            align-items: center;
            justify-content: center;
            padding: 0.5rem;
            margin-right: 0.5rem;
            background-color: transparent;
            border: none;
            cursor: pointer;
            z-index: 51;
            transition: all 0.2s ease;
          }
          
          /* Style for menu close button */
          nav .mobile-menu-close {
            position: absolute;
            top: calc(env(safe-area-inset-top) + 15px);
            right: 15px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          nav .mobile-menu-close:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          
          /* Fix logo size for iPad */
          nav .site-logo {
            font-size: 1.25rem !important;
          }
          
          /* Ensure navigation container fits iPad */
          nav .max-w-7xl {
            max-width: 100% !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          
          /* Improve mobile menu items styling on iPad */
          nav .mobile-menu a,
          nav .mobile-menu button {
            padding: 12px 24px !important;
            font-size: 1.05rem !important;
            display: flex !important;
            align-items: center !important;
            color: white !important;
            border-left: 3px solid transparent;
            transition: all 0.2s ease;
            margin-bottom: 4px;
            font-weight: 500 !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            background-color: rgba(61, 127, 239, 0.3) !important;
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
          }
          
          /* Space between icon and text */
          nav .mobile-menu a svg,
          nav .mobile-menu button svg {
            margin-right: 16px !important;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
            opacity: 1;
          }
          
          /* Add a cleaner hover and active effect */
          nav .mobile-menu a:hover,
          nav .mobile-menu button:hover,
          nav .mobile-menu a.active,
          nav .mobile-menu button.active {
            background-color: rgba(255, 255, 255, 0.25) !important;
            border-left: 3px solid white;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
          
          /* Add animations for menu items */
          nav .mobile-menu a,
          nav .mobile-menu button {
            opacity: 0;
            transform: translateX(20px);
            transition: opacity 0.3s ease, transform 0.3s ease, background-color 0.2s ease, border-left 0.2s ease;
          }
          
          /* When menu is open, animate in the items one by one */
          nav .mobile-menu.open a,
          nav .mobile-menu.open button {
            opacity: 1;
            transform: translateX(0);
          }
          
          /* Stagger the animation for each item */
          nav .mobile-menu.open a:nth-child(1),
          nav .mobile-menu.open button:nth-child(1) { transition-delay: 0.1s; }
          nav .mobile-menu.open a:nth-child(2),
          nav .mobile-menu.open button:nth-child(2) { transition-delay: 0.15s; }
          nav .mobile-menu.open a:nth-child(3),
          nav .mobile-menu.open button:nth-child(3) { transition-delay: 0.2s; }
          nav .mobile-menu.open a:nth-child(4),
          nav .mobile-menu.open button:nth-child(4) { transition-delay: 0.25s; }
          nav .mobile-menu.open a:nth-child(5),
          nav .mobile-menu.open button:nth-child(5) { transition-delay: 0.3s; }
          nav .mobile-menu.open a:nth-child(6),
          nav .mobile-menu.open button:nth-child(6) { transition-delay: 0.35s; }
          nav .mobile-menu.open a:nth-child(7),
          nav .mobile-menu.open button:nth-child(7) { transition-delay: 0.4s; }
        }
        
        /* Script to handle body class for menu backdrop */
        document.addEventListener('DOMContentLoaded', function() {
          const menuButton = document.querySelector('nav .md\\:hidden button');
          const closeButton = document.querySelector('nav .mobile-menu-close');
          const menuItems = document.querySelectorAll('nav .mobile-menu a, nav .mobile-menu button');
          
          if (menuButton) {
            menuButton.addEventListener('click', function() {
              document.body.classList.add('menu-open');
            });
          }
          
          if (closeButton) {
            closeButton.addEventListener('click', function() {
              document.body.classList.remove('menu-open');
            });
          }
          
          /* Close menu when clicking outside */
          document.addEventListener('click', function(e) {
            if (document.body.classList.contains('menu-open') && 
                !e.target.closest('nav .mobile-menu') && 
                !e.target.closest('nav .md\\:hidden button')) {
              document.body.classList.remove('menu-open');
            }
          });
          
          /* Close menu when clicking menu items */
          menuItems.forEach(item => {
            item.addEventListener('click', function() {
              document.body.classList.remove('menu-open');
            });
          });
        });
      `}</style>

      {/* Adding mobile-specific spacing fixes */}
      <style>{`
        /* Mobile spacing improvements */
        @media only screen and (max-width: 767px) {
          /* Improve container padding */
          .container {
            padding-left: 20px !important;
            padding-right: 20px !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          /* Add better spacing for section padding */
          section {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          /* Fix hero section content for more breathing room */
          .hero-section .container {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
          
          /* Improve hero content spacing */
          .hero-section h1 {
            margin-left: -1px !important; /* Optical alignment */
          }
          
          /* Fix form padding */
          form {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          /* Ensure the waitlist button aligns properly */
          button[type="submit"] {
            width: 100% !important;
            margin-top: 12px !important;
          }
          
          /* Better image container proportions */
          .bg-white.rounded-2xl {
            margin-left: -4px !important;
            margin-right: -4px !important;
            width: calc(100% + 8px) !important;
            max-width: unset !important;
          }
          
          /* Make sure food grid items have proper spacing */
          .food-grid {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          
          /* Fix any possible horizontal scrolling */
          .overflow-x-hidden {
            overflow-x: hidden !important;
            width: 100% !important;
            position: relative !important;
          }
          
          /* Make email input full width in mobile */
          input[type="email"] {
            width: 100% !important;
          }
          
          /* Fix vertical spacing between sections */
          .py-12 {
            padding-top: 40px !important;
            padding-bottom: 40px !important;
          }
          
          /* Add safe area padding for notched devices */
          .safe-padding-left {
            padding-left: max(env(safe-area-inset-left), 20px) !important;
          }
          
          .safe-padding-right {
            padding-right: max(env(safe-area-inset-right), 20px) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
