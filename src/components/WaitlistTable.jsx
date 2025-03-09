import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, getDocs, Timestamp, where } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import authService from '../firebase/authService';

const WaitlistTable = () => {
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingUser, setProcessingUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const { isAdmin } = useAuth();
  const userIsAdmin = isAdmin;
  const auth = getAuth();

  useEffect(() => {
    let unsubscribe;

    const fetchWaitlist = async () => {
      try {
        // Check if user has permission to access waitlist
        if (!userIsAdmin) {
          setError('You do not have permission to access the waitlist.');
          setLoading(false);
          return;
        }

        const waitlistRef = collection(db, 'waitlist');
        
        console.log('Fetching waitlist entries...');
        
        // Simple approach: just use onSnapshot for real-time updates
        unsubscribe = onSnapshot(
          query(waitlistRef, orderBy('timestamp', 'desc')), 
          (snapshot) => {
            console.log(`Received ${snapshot.size} waitlist entries`);
            
            if (snapshot.empty) {
              console.log('No waitlist entries found');
            }
            
            const entries = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              
              // Handle timestamp correctly - it might be a Firestore Timestamp or null
              let formattedTimestamp;
              if (data.timestamp) {
                if (data.timestamp instanceof Timestamp) {
                  formattedTimestamp = data.timestamp.toDate();
                } else if (data.timestamp.seconds) {
                  // Handle server timestamp format
                  formattedTimestamp = new Date(data.timestamp.seconds * 1000);
                } else {
                  // Handle if it's already a Date object or some other format
                  formattedTimestamp = new Date(data.timestamp);
                }
              } else {
                // Use current date if timestamp is missing
                formattedTimestamp = new Date();
              }
              
              entries.push({
                id: doc.id,
                ...data,
                timestamp: formattedTimestamp
              });
            });
            
            console.log('Processed entries:', entries);
            setWaitlistEntries(entries);
            setLoading(false);
          },
          (err) => {
            console.error('Error in waitlist snapshot:', err);
            setError(`Failed to load waitlist data: ${err.message}`);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up waitlist listener:', error);
        setError(`Failed to load waitlist data: ${error.message}`);
        setLoading(false);
      }
    };

    fetchWaitlist();
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userIsAdmin]);

  const exportToCSV = () => {
    if (waitlistEntries.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Email', 'Date Joined', 'Status'];
    const csvRows = [
      headers.join(','),
      ...waitlistEntries.map(entry => {
        let dateString = 'Unknown';
        try {
          if (entry.timestamp) {
            dateString = `${entry.timestamp.toLocaleDateString()} ${entry.timestamp.toLocaleTimeString()}`;
          }
        } catch (e) {
          console.error('Error formatting date:', e);
          dateString = 'Error formatting date';
        }
        
        return [
          entry.email,
          dateString,
          entry.status || 'pending'
        ].join(',');
      })
    ];
    const csvContent = csvRows.join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `waitlist_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Use the authService for the generatePassword function
  const generatePassword = () => {
    return authService.generateSecurePassword();
  };

  // Open the password modal
  const openPasswordModal = (entry) => {
    setCurrentEntry(entry);
    setPassword(generatePassword());
    setShowPassword(false);
    setAccountCreated(false);
    setShowPasswordModal(true);
  };

  // Close the password modal
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentEntry(null);
    setPassword('');
  };

  // Copy password to clipboard
  const copyPassword = () => {
    navigator.clipboard.writeText(password).then(() => {
      alert('Password copied to clipboard!');
    });
  };

  // Generate a new password
  const refreshPassword = () => {
    setPassword(generatePassword());
  };

  // Update the createUserAccount function to use our authService
  const createUserAccount = async () => {
    if (!currentEntry || !currentEntry.email || !password) return;
    
    try {
      setProcessingUser(currentEntry.id);
      
      console.log(`Creating account for ${currentEntry.email} with password: ${password}`);
      
      // Use our auth service to create the user with Firebase Authentication
      const user = await authService.createUser(currentEntry.email, password, {
        name: currentEntry.name || '',
        phone: currentEntry.phone || '',
        waitlistId: currentEntry.id,
        isApproved: true,
        created_at: new Date(),
        updated_at: new Date(),
        role: 'regular'
      });
      
      // Test if the credentials work
      const testResult = await authService.testCredentials(currentEntry.email, password);
      if (testResult.success) {
        console.log("Credentials verified successfully!");
      } else {
        console.error("Failed to verify credentials:", testResult.error);
        alert(`Warning: We created the user account but couldn't verify the password "${password}" works correctly with Firebase. Please note it down carefully and test it.`);
      }
      
      // Store the password prominently in the waitlist entry for admin reference
      const waitlistData = {
        status: 'registered',
        approvedAt: new Date(),
        registeredAt: new Date(),
        uid: user.uid,
        tempPassword: password,
        lastUsedPassword: password,
        passwordCreatedAt: new Date().toISOString()
      };
      
      console.log(`Updating waitlist entry with data:`, waitlistData);
      await updateDoc(doc(db, 'waitlist', currentEntry.id), waitlistData);
      
      console.log(`User account created for ${currentEntry.email} with UID: ${user.uid}`);
      
      setAccountCreated(true);
      
      // Update the entry in the local state
      setWaitlistEntries(prev => 
        prev.map(entry => 
          entry.id === currentEntry.id 
            ? {...entry, status: 'registered', uid: user.uid, registeredAt: new Date(), tempPassword: password, lastUsedPassword: password} 
            : entry
        )
      );
      
    } catch (error) {
      console.error('Error creating user account:', error);
      setError(`Failed to create user account: ${error.message}`);
    } finally {
      setProcessingUser(null);
    }
  };

  // Approve a user from the waitlist
  const approveUser = async (entry) => {
    if (!entry || !entry.email) return;
    
    try {
      setProcessingUser(entry.id);
      
      // Generate a secure password
      const generatedPassword = generatePassword();
      
      console.log(`Approving user ${entry.email} with generated password`);
      
      // Try to find if this user already exists in Firebase Auth
      let existingUser = false;
      let uid;
      
      // First check for existing auth account by trying to sign in with various methods
      try {
        // Check if the user exists in Firebase Auth by sending a password reset email
        // This is a non-destructive way to check if an email is registered
        await authService.resetPassword(entry.email);
        console.log(`User ${entry.email} exists in Firebase Auth, password reset email sent`);
        existingUser = true;
        
        // Try to find the UID from existing records
        try {
          // Check in users collection
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', entry.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            uid = querySnapshot.docs[0].id;
            console.log(`Found existing user with UID: ${uid}`);
          }
        } catch (findError) {
          console.log('Error finding existing user:', findError);
        }
        
        if (!uid) {
          // Generate a temporary UID if we couldn't find the real one
          uid = `existing_${Date.now().toString()}${Math.random().toString(36).substring(2, 15)}`;
          console.log(`Generated temporary UID for existing user: ${uid}`);
        }
        
        // Alert the admin that we're working with an existing account
        alert(`Note: The user ${entry.email} already has a Firebase account. We've sent them a password reset email so they can set their own password. We'll still create the necessary database records.`);
      } catch (resetError) {
        // If password reset fails, the user likely doesn't exist
        console.log(`User ${entry.email} does not exist in Firebase Auth yet:`, resetError);
        existingUser = false;
      }
      
      // If user doesn't exist, create a new Firebase Authentication account
      if (!existingUser) {
        try {
          // Create the Firebase Auth account
          const user = await authService.createUser(entry.email, generatedPassword, {
            name: entry.name || '',
            phone: entry.phone || '',
            waitlistId: entry.id,
            isApproved: true,
            created_at: new Date(),
            updated_at: new Date(),
            role: 'regular'
          });
          
          if (!user || !user.uid) {
            throw new Error('Failed to create Firebase authentication account');
          }
          
          uid = user.uid;
          console.log(`Successfully created Firebase Auth account for ${entry.email} with ID ${uid}`);
          
          // Verify the account works
          const verifyResult = await authService.testCredentials(entry.email, generatedPassword);
          if (!verifyResult.success) {
            throw new Error('Created account but couldn\'t verify credentials');
          }
          console.log('Credentials verified successfully!');
          
        } catch (authError) {
          // Handle the case where the email is already in use
          if (authError.code === 'auth/email-already-in-use') {
            console.log('Email already in use, will update database records only');
            existingUser = true;
            
            // Send password reset email to the user
            try {
              await authService.resetPassword(entry.email);
              alert(`The email ${entry.email} is already registered. We've sent a password reset email to the user so they can set their own password. We'll still create the necessary database records.`);
            } catch (resetError) {
              console.error('Error sending password reset:', resetError);
            }
            
            // Generate a temporary UID
            uid = `existing_${Date.now().toString()}${Math.random().toString(36).substring(2, 15)}`;
          } else {
            // For other errors, alert and stop
            console.error('Error creating Firebase auth user:', authError);
            alert(`Could not create login account: ${authError.message}. Please try again or contact support.`);
            throw new Error(`Failed to create authentication account: ${authError.message}`);
          }
        }
      } else if (!uid) {
        // Use entry's ID if no UID was determined
        uid = entry.uid || `waitlist_${Date.now().toString()}${Math.random().toString(36).substring(2, 15)}`;
      }
      
      // Now that we have a verified Firebase Auth account, update the collections
      
      // Add user to approved_users collection with password
      await setDoc(doc(db, 'approved_users', uid), {
        email: entry.email,
        approvedAt: new Date(),
        waitlistId: entry.id,
        name: entry.name || '',
        phone: entry.phone || '',
        isApproved: true,
        tempPassword: generatedPassword,
        passwordCreatedAt: new Date().toISOString()
      });
      
      // Add user to users collection with role set to 'regular' and password
      await setDoc(doc(db, 'users', uid), {
        email: entry.email,
        created_at: new Date(),
        updated_at: new Date(),
        role: 'regular',
        isApproved: true,
        name: entry.name || '',
        phone: entry.phone || '',
        tempPassword: generatedPassword,
        passwordCreatedAt: new Date().toISOString()
      });
      
      // Update waitlist entry status and store password
      await updateDoc(doc(db, 'waitlist', entry.id), {
        status: 'approved',
        approvedAt: new Date(),
        uid: uid,
        tempPassword: generatedPassword,
        lastUsedPassword: generatedPassword,
        passwordCreatedAt: new Date().toISOString()
      });
      
      // Update the entry in the local state
      setWaitlistEntries(prev => 
        prev.map(e => 
          e.id === entry.id 
            ? {
                ...e, 
                status: 'approved', 
                uid, 
                approvedAt: new Date(),
                tempPassword: generatedPassword,
                lastUsedPassword: generatedPassword
              } 
            : e
        )
      );
      
      // Show password to admin
      setCurrentEntry({...entry, tempPassword: generatedPassword, email: entry.email});
      setPassword(generatedPassword);
      setShowPassword(true);
      setAccountCreated(true);
      setShowPasswordModal(true);
      
      console.log(`User ${entry.email} has been fully approved with ID ${uid} and can now log in`);
      
    } catch (error) {
      console.error('Error approving user:', error);
      alert(`Error approving user: ${error.message}`);
    } finally {
      setProcessingUser(null);
    }
  };

  // New function to view password for registered users
  const viewUserPassword = (entry) => {
    if (entry.tempPassword) {
      setCurrentEntry(entry);
      setPassword(entry.tempPassword);
      setShowPassword(true);
      setAccountCreated(true);
      setShowPasswordModal(true);
    } else {
      alert("Password information is not available for this user.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
        <div className="mt-3">
          <p className="text-sm">Possible solutions:</p>
          <ul className="list-disc pl-5 text-sm mt-1">
            <li>Make sure you are logged in as an administrator</li>
            <li>Check your Firebase security rules</li>
            <li>Verify your network connection</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Waitlist Entries</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {waitlistEntries.length} people have joined the waitlist
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const passwordsInfo = waitlistEntries
                  .filter(entry => entry.tempPassword || entry.lastUsedPassword)
                  .map(entry => `${entry.email}: ${entry.tempPassword || entry.lastUsedPassword}`)
                  .join('\n');
                
                if (passwordsInfo) {
                  console.log("User passwords:", passwordsInfo);
                  alert(`User Passwords:\n\n${passwordsInfo}`);
                } else {
                  alert("No stored passwords found for any users.");
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Show All Passwords
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Joined
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {waitlistEntries.length > 0 ? (
                waitlistEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {entry.timestamp ? `${entry.timestamp.toLocaleDateString()} ${entry.timestamp.toLocaleTimeString()}` : 'Unknown date'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        entry.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : entry.status === 'contacted'
                            ? 'bg-blue-100 text-blue-800'
                            : entry.status === 'registered'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {entry.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.tempPassword || entry.lastUsedPassword ? (
                        <div className="flex items-center space-x-1">
                          <span className="font-mono text-xs bg-gray-100 p-1 rounded border border-gray-300">
                            {entry.tempPassword || entry.lastUsedPassword}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(entry.tempPassword || entry.lastUsedPassword);
                              alert(`Password copied to clipboard!`);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {entry.status === 'pending' ? (
                        <button
                          onClick={() => approveUser(entry)}
                          disabled={processingUser === entry.id}
                          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                            processingUser === entry.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {processingUser === entry.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Approve User
                            </>
                          )}
                        </button>
                      ) : entry.status === 'approved' ? (
                        <button
                          onClick={() => openPasswordModal(entry)}
                          disabled={processingUser === entry.id}
                          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            processingUser === entry.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm3 8V6a3 3 0 10-6 0v4h6z" clipRule="evenodd" />
                          </svg>
                          Create Account
                        </button>
                      ) : entry.status === 'registered' ? (
                        <div className="flex justify-end space-x-2">
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full">
                            Account Created
                          </span>
                          {entry.tempPassword && (
                            <button
                              onClick={() => viewUserPassword(entry)}
                              className="inline-flex items-center px-2 py-1 border border-transparent rounded-md text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <svg className="-ml-0.5 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                              View Password
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">
                          {entry.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No waitlist entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && currentEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Create Account for {currentEntry.email}</h3>
              <button 
                onClick={closePasswordModal}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {accountCreated ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                    <div className="flex">
                      <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="ml-3 text-sm text-green-700">
                        Account successfully created for {currentEntry.email}!
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <div className="flex">
                      <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-800">
                          Important: Save this password information!
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          This is the only time you'll see the full password. Share it with the user securely.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User's Temporary Password
                    </label>
                    <div className="flex items-center">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="block w-full p-2 border border-gray-300 rounded-md text-lg font-mono bg-white"
                        value={password}
                        readOnly
                      />
                      <button
                        type="button"
                        className="ml-2 p-2 text-gray-400 hover:text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="mt-2 flex space-x-2">
                      <button
                        type="button"
                        onClick={copyPassword}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy Password
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>Tell the user to:</p>
                    <ol className="list-decimal pl-5 mt-1 space-y-1">
                      <li>Log in with the email: <strong>{currentEntry.email}</strong></li>
                      <li>Use this temporary password (shown above)</li>
                      <li>Use the "Forgot Password" link if they need to reset it later</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={refreshPassword}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generate New
                    </button>
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 sm:mt-6 space-y-2">
              {!accountCreated && (
                <button
                  type="button"
                  onClick={createUserAccount}
                  disabled={processingUser === currentEntry.id}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingUser === currentEntry.id ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              )}
              
              <button
                type="button"
                onClick={closePasswordModal}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {accountCreated ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WaitlistTable;