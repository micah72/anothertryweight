import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from './LoadingSpinner';

const ProgressCharts = ({ weightData, calorieData, loading }) => {
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Weight Progress Chart */}
      <div className="card-base">
        <h3 className="text-xl font-semibold mb-4">Weight Progress</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#4F46E5" 
                name="Weight (kg)"
              />
              <Line 
                type="monotone" 
                dataKey="targetWeight" 
                stroke="#10B981" 
                name="Target Weight (kg)" 
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calorie Intake Chart */}
      <div className="card-base">
        <h3 className="text-xl font-semibold mb-4">Calorie Intake</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={calorieData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="#4F46E5" 
                name="Calories"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#10B981" 
                name="Target Calories" 
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ProgressCharts;