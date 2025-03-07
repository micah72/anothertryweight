import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Footer = () => {
  const { userRole, isAdmin } = useAuth();
  const userIsAdmin = isAdmin;
  
  // Safari flexbox workaround
  const safariFlexClass = 'flex flex-wrap';
  
  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-12 w-full safe-padding-bottom">
      <div className="container mx-auto px-4 safe-padding-left safe-padding-right">
        <div className={`flex flex-col md:flex-row justify-between items-center ${safariFlexClass}`}>
          <div className="mb-6 md:mb-0">
            <h2 className="text-xl sm:text-2xl font-bold">SnapLicious AI</h2>
            <p className="text-gray-400 mt-2">Snap, Analyze, Plan</p>
          </div>

          <div className={`flex flex-wrap justify-center gap-4 sm:gap-6 ${safariFlexClass}`}>
            <Link to="/" className="hover:text-blue-400 transition-colors">Home</Link>
            <Link to="/about" className="hover:text-blue-400 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link>
            {!userIsAdmin && (
              <Link to="/admin-login" className="hover:text-blue-400 transition-colors">Admin</Link>
            )}
            {userIsAdmin && (
              <Link to="/admin-dashboard" className="hover:text-blue-400 transition-colors font-semibold text-blue-300">
                Dashboard
              </Link>
            )}
            <a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} SnapLicious AI. All rights reserved.</p>
          <p className="mt-2 text-xs sm:text-sm">*AI Forward: Leveraging cutting-edge artificial intelligence to provide smarter health insights through photography and meal planning.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 