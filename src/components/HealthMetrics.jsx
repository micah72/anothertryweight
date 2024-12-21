import React, { useState, useEffect } from 'react';
import dbService from '../db/database';
import ProgressCharts from './ProgressCharts';

const HealthMetrics = () => {
  const [metrics, setMetrics] = useState({
    weight: 0,
    height: 0,
    age: 0,
    target_weight: 0,
    totalCalories: 0,
    averageHealthScore: 0,
  });

  const [chartData, setChartData] = useState({
    weightData: [],
    calorieData: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const user = dbService.getUser(1); // Using user ID 1 for now
      const foodEntries = dbService.getFoodEntries(1);
      
      // Process food entries for charts
      const processedEntries = processFoodEntries(foodEntries);
      
      setChartData({
        weightData: generateWeightData(user.weight, user.target_weight),
        calorieData: processedEntries.calorieData
      });

      setMetrics({
        ...user,
        totalCalories: processedEntries.totalCalories,
        averageHealthScore: processedEntries.averageHealthScore
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processFoodEntries = (entries) => {
    const calorieData = entries.map(entry => ({
      date: new Date(entry.created_at).toLocaleDateString(),
      calories: entry.calories,
      target: 2000 // This should be calculated based on user's goals
    }));

    const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
    const averageHealthScore = entries.length > 0
      ? entries.reduce((sum, entry) => sum + entry.health_score, 0) / entries.length
      : 0;

    return {
      calorieData,
      totalCalories,
      averageHealthScore: averageHealthScore.toFixed(1)
    };
  };

  const generateWeightData = (currentWeight, targetWeight) => {
    // Generate mock weight data for demonstration
    // In a real app, this would come from actual weight recordings
    const data = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString(),
        weight: currentWeight - (currentWeight - targetWeight) * ((30 - i) / 30),
        targetWeight
      });
    }
    return data;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Health Metrics</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base">
          <h3 className="text-lg font-semibold mb-2">Current Weight</h3>
          <p className="text-2xl font-bold">{metrics.weight} kg</p>
          <p className="text-sm text-gray-500">Target: {metrics.target_weight} kg</p>
        </div>

        <div className="card-base">
          <h3 className="text-lg font-semibold mb-2">Daily Calories</h3>
          <p className="text-2xl font-bold">{Math.round(metrics.totalCalories / 7)} kcal</p>
          <p className="text-sm text-gray-500">7-day average</p>
        </div>

        <div className="card-base">
          <h3 className="text-lg font-semibold mb-2">Health Score</h3>
          <p className="text-2xl font-bold">{metrics.averageHealthScore}/10</p>
          <p className="text-sm text-gray-500">Average from meals</p>
        </div>
      </div>

      {/* Charts */}
      <ProgressCharts 
        weightData={chartData.weightData}
        calorieData={chartData.calorieData}
        loading={loading}
      />
    </div>
  );
};

export default HealthMetrics;