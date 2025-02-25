import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Navigation from './components/Navigation';
import AdminLogin from './components/AdminLogin';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import FoodGallery from './components/FoodGallery';
import ImageAnalysis from './components/ImageAnalysis';
import HealthMetrics from './components/HealthMetrics';
import Goals from './components/Goals';
import RefrigeratorGrid from './components/RefrigeratorGrid';
import RefrigeratorAnalysis from './components/RefrigeratorAnalysis';
import MealPlanner from './components/MealPlanner';
import FoodRecommendations from './components/FoodRecommendations';
import UserProfile from './components/UserProfile';
import AboutPage from './components/AboutPage';
import StayHealthyPage from './components/StayHealthyPage';
import ContactPage from './components/ContactPage';
import AdminRoute from './components/AdminRoute';
import ApprovedUserRoute from './components/ApprovedUserRoute';

// CSS
import './App.css';

function AppContent() {
  const { user, isAdmin, isApproved } = useAuth();

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Navigation />
      
      <main className="flex-grow w-full">
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
          <Route path="/refrigerator" element={
            <ApprovedUserRoute>
              <RefrigeratorGrid />
            </ApprovedUserRoute>
          } />
          <Route path="/refrigerator/analyze" element={
            <ApprovedUserRoute>
              <RefrigeratorAnalysis />
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