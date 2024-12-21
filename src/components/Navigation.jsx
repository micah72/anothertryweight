import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Camera, Home, User, Target, Activity, Calendar, Utensils } from 'lucide-react';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Home' },
    { path: '/analyze', icon: <Camera className="w-5 h-5" />, label: 'Analyze Food' },
    { path: '/goals', icon: <Target className="w-5 h-5" />, label: 'Goals' },
    { path: '/health', icon: <Activity className="w-5 h-5" />, label: 'Health' },
    { path: '/meal-planner', icon: <Calendar className="w-5 h-5" />, label: 'Meal Planner' },
    { path: '/recommendations', icon: <Utensils className="w-5 h-5" />, label: 'Recommendations' },
    { path: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' }
  ];

  return (
    <nav className="bg-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            <Link to="/" className="flex items-center text-white text-xl font-bold">
              HealthTracker
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex md:items-center md:ml-10">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-white hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium ml-2"
                >
                  <div className="flex items-center space-x-1">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-primary">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-primary/90 block px-3 py-2 rounded-md text-base font-medium"
              >
                <div className="flex items-center space-x-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;