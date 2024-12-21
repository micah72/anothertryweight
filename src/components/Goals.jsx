import React, { useState, useEffect } from 'react';
import dbService from '../db/database';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({
    type: 'weight',
    target_value: '',
    current_value: '',
    deadline: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = () => {
    try {
      const userGoals = dbService.getGoals(1); // Using user ID 1 for now
      setGoals(userGoals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dbService.addGoal({
        userId: 1,
        ...newGoal
      });
      loadGoals();
      setNewGoal({
        type: 'weight',
        target_value: '',
        current_value: '',
        deadline: ''
      });
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Health Goals</h2>

      {/* Add New Goal Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Add New Goal</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Goal Type</label>
            <select
              value={newGoal.type}
              onChange={(e) => setNewGoal({...newGoal, type: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="weight">Weight Loss</option>
              <option value="calories">Daily Calories</option>
              <option value="exercise">Exercise Minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Target Value</label>
            <input
              type="number"
              value={newGoal.target_value}
              onChange={(e) => setNewGoal({...newGoal, target_value: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Current Value</label>
            <input
              type="number"
              value={newGoal.current_value}
              onChange={(e) => setNewGoal({...newGoal, current_value: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Target Date</label>
            <input
              type="date"
              value={newGoal.deadline}
              onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Add Goal
          </button>
        </form>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-lg font-semibold capitalize">{goal.type}</h4>
              <span className="text-sm text-gray-500">
                Due: {new Date(goal.deadline).toLocaleDateString()}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Target: {goal.target_value}</span>
                <span>Current: {goal.current_value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, (goal.current_value / goal.target_value) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Goals;