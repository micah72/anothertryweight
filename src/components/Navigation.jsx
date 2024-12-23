import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ChevronDown,
  Camera, 
  Home, 
  User, 
  Activity, 
  Calendar, 
  Utensils,
  RefrigeratorIcon
} from 'lucide-react';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const menuStructure = [
    {
      label: 'Home',
      path: '/',
      icon: <Home className="w-5 h-5" />
    },
    {
      label: 'Track',
      icon: <Activity className="w-5 h-5" />,
      children: [
        { label: 'Analyze Food', path: '/analyze', icon: <Camera className="w-5 h-5" /> },
        { label: 'Health Metrics', path: '/health', icon: <Activity className="w-5 h-5" /> },
        { label: 'Goals', path: '/goals', icon: <Activity className="w-5 h-5" /> }
      ]
    },
    {
      label: 'Kitchen',
      icon: <RefrigeratorIcon className="w-5 h-5" />,
      children: [
        { label: 'My Refrigerator', path: '/refrigerator', icon: <RefrigeratorIcon className="w-5 h-5" /> },
        { label: 'Scan Contents', path: '/refrigerator/analyze', icon: <Camera className="w-5 h-5" /> }
      ]
    },
    {
      label: 'Plan',
      icon: <Calendar className="w-5 h-5" />,
      children: [
        { label: 'Meal Planner', path: '/meal-planner', icon: <Calendar className="w-5 h-5" /> },
        { label: 'Recommendations', path: '/recommendations', icon: <Utensils className="w-5 h-5" /> }
      ]
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: <User className="w-5 h-5" />
    }
  ];

  const toggleDropdown = (label) => {
    if (activeDropdown === label) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(label);
    }
  };

  const DropdownMenu = ({ item }) => {
    const isActive = activeDropdown === item.label;

    return (
      <div className="relative inline-block text-left">
        <button
          onClick={() => toggleDropdown(item.label)}
          className="flex items-center space-x-1 text-white hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium"
        >
          {item.icon}
          <span>{item.label}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isActive ? 'transform rotate-180' : ''}`} />
        </button>

        {isActive && (
          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              {item.children.map((child) => (
                <Link
                  key={child.path}
                  to={child.path}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    toggleDropdown(item.label);
                    setIsOpen(false);
                  }}
                >
                  {child.icon}
                  <span>{child.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="bg-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-white text-xl font-bold">
              HealthTracker
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {menuStructure.map((item) => (
              item.children ? (
                <DropdownMenu key={item.label} item={item} />
              ) : (
                <Link
                  key={item.label}
                  to={item.path}
                  className="flex items-center space-x-1 text-white hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white p-2 rounded-md"
            >
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
        <div className="md:hidden bg-primary border-t border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuStructure.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleDropdown(item.label)}
                      className="w-full flex items-center justify-between text-white hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      <div className="flex items-center space-x-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === item.label ? 'transform rotate-180' : ''}`} />
                    </button>
                    {activeDropdown === item.label && (
                      <div className="pl-4 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className="flex items-center space-x-2 text-white/80 hover:bg-primary/90 px-3 py-2 rounded-md text-sm"
                            onClick={() => setIsOpen(false)}
                          >
                            {child.icon}
                            <span>{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className="flex items-center space-x-2 text-white hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;