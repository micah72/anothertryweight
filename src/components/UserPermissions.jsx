import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle } from 'lucide-react';

// Component to display permissions based on a user's role
const UserPermissions = () => {
  const { userRole, hasPermission } = useAuth();

  // Define all available permissions
  const allPermissions = {
    'basic_features': {
      label: 'Basic Features',
      description: 'Access to core application functionality'
    },
    'track_weight': {
      label: 'Track Weight',
      description: 'Record and monitor weight changes'
    },
    'view_recommendations': {
      label: 'View Recommendations',
      description: 'See personalized food recommendations'
    },
    'view_admin_dashboard': {
      label: 'Admin Dashboard',
      description: 'Access to the admin dashboard'
    },
    'manage_users': {
      label: 'Manage Users',
      description: 'Create, edit, and delete user accounts'
    },
    'manage_permissions': {
      label: 'Manage Permissions',
      description: 'Change permission settings for users'
    },
    'access_all_features': {
      label: 'All Features',
      description: 'Unrestricted access to all app features'
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Your Account Permissions
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Current role: <span className="font-medium">{userRole}</span>
        </p>
      </div>
      
      <div className="border-t border-gray-200">
        <dl>
          {Object.entries(allPermissions).map(([permKey, permData], index) => {
            const hasAccess = hasPermission(permKey);
            return (
              <div 
                key={permKey}
                className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}
              >
                <dt className="text-sm font-medium text-gray-500">
                  {permData.label}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-center">
                    {hasAccess ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                        <span>Permitted</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500 mr-2" />
                        <span>Not permitted</span>
                      </>
                    )}
                    <span className="ml-4 text-xs text-gray-500">{permData.description}</span>
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
};

export default UserPermissions; 