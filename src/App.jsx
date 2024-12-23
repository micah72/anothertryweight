import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ImageAnalysis from './components/ImageAnalysis';
import FoodTileGrid from './components/FoodTileGrid';
import UserProfile from './components/UserProfile';
import Goals from './components/Goals';
import HealthMetrics from './components/HealthMetrics';
import MealPlanner from './components/MealPlanner';
import FoodRecommendations from './components/FoodRecommendations';
import RefrigeratorAnalysis from './components/RefrigeratorAnalysis';
import RefrigeratorGrid from './components/RefrigeratorGrid';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<FoodTileGrid />} />
            <Route path="/analyze" element={<ImageAnalysis />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/health" element={<HealthMetrics />} />
            <Route path="/meal-planner" element={<MealPlanner />} />
            <Route path="/recommendations" element={<FoodRecommendations />} />
            <Route path="/refrigerator" element={<RefrigeratorGrid />} />
            <Route path="/refrigerator/analyze" element={<RefrigeratorAnalysis />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;