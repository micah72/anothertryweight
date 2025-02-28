import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components that are used on initial load
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import AdminRoute from './components/AdminRoute';
import ApprovedUserRoute from './components/ApprovedUserRoute';
import MetaTags from './components/MetaTags';

// Lazy load all other components
const LandingPage = lazy(() => import('./components/LandingPage'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const Login = lazy(() => import('./components/Login'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
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

// CSS
import './App.css';
import './styles/browser-compatibility.css';
import './styles/global.css';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen">
    <LoadingSpinner />
    <p className="ml-2 text-gray-600">Loading...</p>
  </div>
);

function AppContent() {
  const { user, isAdmin, isApproved } = useAuth();
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  
  // Detect browser and device type
  useEffect(() => {
    // Add class to body based on browser detection
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      document.body.classList.add('safari');
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
    };
  }, [orientation]);

  return (
    <div className={`flex flex-col min-h-screen w-full ${orientation === 'landscape' ? 'ipad-pro-landscape-fix' : 'ipad-pro-portrait-fix'}`}>
      <MetaTags />
      <Navigation />
      
      <main className="flex-grow w-full">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/stay-healthy" element={<StayHealthyPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* User Routes - Protected for Approved Users */}
            <Route path="/gallery" element={
              <ApprovedUserRoute>
                <FoodGallery />
              </ApprovedUserRoute>
            } />
            
            {/* Track Menu Routes - Protected */}
            <Route path="/analyze" element={
              <ApprovedUserRoute>
                <ImageAnalysis />
              </ApprovedUserRoute>
            } />
            <Route path="/health" element={
              <ApprovedUserRoute>
                <HealthMetrics />
              </ApprovedUserRoute>
            } />
            <Route path="/goals" element={
              <ApprovedUserRoute>
                <Goals />
              </ApprovedUserRoute>
            } />
            
            {/* Kitchen Menu Routes - Protected */}
            <Route path="/refrigerator/analyze" element={
              <ApprovedUserRoute>
                <RefrigeratorAnalysis />
              </ApprovedUserRoute>
            } />
            <Route path="/refrigerator" element={
              <ApprovedUserRoute>
                <RefrigeratorGrid />
              </ApprovedUserRoute>
            } />
            <Route path="/scan" element={
              <ApprovedUserRoute>
                <RefrigeratorAnalysis />
              </ApprovedUserRoute>
            } />
            
            {/* Plan Menu Routes - Protected */}
            <Route path="/meal-planner" element={
              <ApprovedUserRoute>
                <MealPlanner />
              </ApprovedUserRoute>
            } />
            <Route path="/recommendations" element={
              <ApprovedUserRoute>
                <FoodRecommendations />
              </ApprovedUserRoute>
            } />
            
            {/* Profile Route - Protected */}
            <Route path="/profile" element={
              <ApprovedUserRoute>
                <UserProfile />
              </ApprovedUserRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;