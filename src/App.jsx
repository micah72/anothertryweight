import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';

// Components that are used on initial load
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import AdminRoute from './components/AdminRoute';
import ProtectedLazyRoute from './components/ProtectedLazyRoute';
import MetaTags from './components/MetaTags';
import Footer from './components/Footer';
import DevModeToggle from './components/DevModeToggle';

// Lazy load all other components
const LandingPage = lazy(() => import('./components/LandingPage'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const Login = lazy(() => import('./components/Login'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SimpleAdminDashboard = lazy(() => import('./components/SimpleAdminDashboard'));
const FoodGallery = lazy(() => import('./components/FoodGallery'));
const ImageAnalysis = lazy(() => import('./components/ImageAnalysis'));
const HealthMetrics = lazy(() => import('./components/HealthMetrics'));
const Goals = lazy(() => import('./components/Goals'));
const RefrigeratorGrid = lazy(() => import('./components/RefrigeratorGrid'));
const RefrigeratorAnalysis = lazy(() => import('./components/RefrigeratorAnalysis'));
const MealPlanner = lazy(() => import('./components/MealPlanner'));
const FoodRecommendations = lazy(() => import('./components/FoodRecommendations'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const StayHealthyPage = lazy(() => import('./components/StayHealthyPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const AccessDeniedPage = lazy(() => import('./components/AccessDeniedPage'));

// CSS
import './App.css';
import './styles/browser-compatibility.css';
import './styles/global.css';
import './styles/createUserAccount.css';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen">
    <LoadingSpinner />
    <p className="ml-2 text-gray-600">Loading...</p>
  </div>
);

function AppContent() {
  const { user, isAdmin, isApproved } = useAuth();
  const userIsAdmin = isAdmin;
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Detect browser and device type
  useEffect(() => {
    // Add class to body based on browser detection
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      document.body.classList.add('safari');
    }
    
    // Detect iOS devices
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    
    if (iOS) {
      document.body.classList.add('ios-device');
    }
    
    // Detect if app is running in standalone mode (PWA)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator.standalone) || 
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    
    if (standalone) {
      document.body.classList.add('pwa-mode');
    }
    
    // Add class for iPad detection
    const isIPad = /iPad/i.test(navigator.userAgent) || 
      (navigator.maxTouchPoints && 
       navigator.maxTouchPoints > 2 && 
       /MacIntel/.test(navigator.platform));
    if (isIPad) {
      document.body.classList.add('ipad');
      
      // Add orientation class
      document.body.classList.add(orientation === 'landscape' ? 'ipad-landscape' : 'ipad-portrait');
    }
    
    // Add admin-user class when admin is logged in
    if (userIsAdmin) {
      document.body.classList.add('admin-user');
    } else {
      document.body.classList.remove('admin-user');
    }
    
    // Fix for iOS vh units (viewport height) issue
    const setVhProperty = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Handle orientation changes
    const handleResize = () => {
      setVhProperty();
      
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      if (orientation !== newOrientation) {
        setOrientation(newOrientation);
        
        if (isIPad) {
          document.body.classList.remove('ipad-landscape', 'ipad-portrait');
          document.body.classList.add(newOrientation === 'landscape' ? 'ipad-landscape' : 'ipad-portrait');
        }
      }
    };
    
    setVhProperty();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Fix for Safari scrolling issues
    if (isSafari || isIPad) {
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.overscrollBehavior = 'none';
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      // Clean up admin class
      document.body.classList.remove('admin-user');
    };
  }, [orientation, userIsAdmin]);

  return (
    <>
      {/* Status bar overlay for iOS devices with notches */}
      {isIOS && <div className="status-bar" aria-hidden="true" />}
      
      <div className={`flex flex-col min-h-screen w-full ${orientation === 'landscape' ? 'ipad-pro-landscape-fix' : 'ipad-pro-portrait-fix'}`}>
        <MetaTags />
        <Navigation />
        <DevModeToggle />
        
        <main className="flex-grow w-full">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/stay-healthy" element={<StayHealthyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/admin-dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              {/* User Routes - Protected for Approved Users */}
              <Route path="/gallery" element={<ProtectedLazyRoute component={FoodGallery} requiredPermission="basic_features" />} />
              
              {/* Track Menu Routes - Protected */}
              <Route path="/analyze" element={<ProtectedLazyRoute component={ImageAnalysis} requiredPermission="basic_features" />} />
              <Route path="/health" element={<ProtectedLazyRoute component={HealthMetrics} requiredPermission="track_weight" />} />
              <Route path="/goals" element={<ProtectedLazyRoute component={Goals} requiredPermission="basic_features" />} />
              
              {/* Kitchen Menu Routes - Protected */}
              <Route path="/refrigerator/analyze" element={<ProtectedLazyRoute component={RefrigeratorAnalysis} requiredPermission="basic_features" />} />
              <Route path="/refrigerator" element={<ProtectedLazyRoute component={RefrigeratorGrid} requiredPermission="basic_features" />} />
              <Route path="/scan" element={<ProtectedLazyRoute component={RefrigeratorAnalysis} requiredPermission="basic_features" />} />
              
              {/* Plan Menu Routes - Protected */}
              <Route path="/meal-planner" element={<ProtectedLazyRoute component={MealPlanner} requiredPermission="basic_features" />} />
              <Route path="/recommendations" element={<ProtectedLazyRoute component={FoodRecommendations} requiredPermission="view_recommendations" />} />
              
              {/* Profile Route - Protected */}
              <Route path="/profile" element={<ProtectedLazyRoute component={UserProfile} requiredPermission="basic_features" />} />
              
              {/* 404 Route - Catch All */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
        
        <Footer />
      </div>
    </>
  );
}

function App() {
  return (
    <GlobalErrorHandler>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </GlobalErrorHandler>
  );
}

export default App;