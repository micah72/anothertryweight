import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import dbService from '../firebase/dbService';
import { useAuth } from '../contexts/AuthContext';

const HealthScoreBar = ({ score }) => {
  const getScoreColor = (score) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-lime-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full">
        <div
          className={`h-full rounded-full ${getScoreColor(score)}`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium">{score}/10</span>
    </div>
  );
};

const FoodCard = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getBenefitsAndConcerns = () => {
    try {
      const data = typeof entry.analysisData === 'string' 
        ? JSON.parse(entry.analysisData) 
        : entry.analysisData;
      
      return {
        benefits: data?.benefits || '',
        concerns: data?.concerns || ''
      };
    } catch (error) {
      return { benefits: '', concerns: '' };
    }
  };

  const { benefits, concerns } = getBenefitsAndConcerns();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="aspect-w-16 aspect-h-9">
        <img
          src={entry.imagePath}
          alt={entry.foodName || 'Food item'}
          className="w-full h-48 object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{entry.foodName}</h3>
          <span className="text-sm font-medium text-primary">{entry.calories} cal</span>
        </div>

        {/* Custom Collapsible Section */}
        <div className="border rounded-lg">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 flex justify-between items-center hover:bg-gray-50"
          >
            <span className="text-sm font-medium">Health Information</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'transform rotate-180' : ''
              }`}
            />
          </button>
          
          {isExpanded && (
            <div className="px-4 py-3 border-t space-y-3">
              <div>
                <label className="text-sm text-gray-600">Health Score</label>
                <HealthScoreBar score={entry.healthScore} />
              </div>

              {benefits && (
                <div className="bg-green-50 p-2 rounded">
                  <label className="text-sm text-green-700 font-medium">Benefits</label>
                  <p className="text-sm text-green-600">{benefits}</p>
                </div>
              )}

              {concerns && (
                <div className="bg-yellow-50 p-2 rounded">
                  <label className="text-sm text-yellow-700 font-medium">Concerns</label>
                  <p className="text-sm text-yellow-600">{concerns}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(entry.created_at)}
        </div>
      </div>
    </div>
  );
};

const FoodTileGrid = () => {
  const [entries, setEntries] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribe = () => {};

    if (user) {
      console.log('Setting up subscription for user:', user.uid);
      unsubscribe = dbService.subscribeFoodEntries(
        user.uid,
        'food',
        (newEntries) => {
          console.log('Received food entries:', newEntries);
          setEntries(newEntries);
        }
      );
    }

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center text-gray-500 py-10">
          Please log in to view your food journal.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Food Journal</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map((entry) => (
          <FoodCard key={entry.id} entry={entry} />
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No food entries yet. Start by analyzing some food!
        </div>
      )}
    </div>
  );
};

export default FoodTileGrid;