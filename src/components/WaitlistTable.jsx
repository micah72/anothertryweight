import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../firebase/config';

const WaitlistTable = () => {
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingUser, setProcessingUser] = useState(null);

  useEffect(() => {
    const fetchWaitlist = async () => {
      try {
        const q = query(
          collection(db, 'waitlist'),
          orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const entries = [];
          snapshot.forEach((doc) => {
            entries.push({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date()
            });
          });
          setWaitlistEntries(entries);
          setLoading(false);
          setError(null); // Clear any previous errors
        }, (err) => {
          console.error('Error fetching waitlist:', err);
          
          // Provide more specific error messages based on the error code
          if (err.code === 'permission-denied') {
            setError('Failed to load waitlist data: You do not have permission to access this data. Please make sure you are logged in as an admin.');
          } else {
            setError(`Failed to load waitlist data: ${err.message}`);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('Error setting up waitlist listener:', err);
        setError('Failed to set up waitlist data listener. Please refresh the page and try again.');
        setLoading(false);
      }
    };

    fetchWaitlist();
  }, []);

  const exportToCSV = () => {
    if (waitlistEntries.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Email', 'Date Joined', 'Status'];
    const csvRows = [
      headers.join(','),
      ...waitlistEntries.map(entry => [
        entry.email,
        `${entry.timestamp.toLocaleDateString()} ${entry.timestamp.toLocaleTimeString()}`,
        entry.status || 'pending'
      ].join(','))
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

  // Generate a random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Approve a user from the waitlist
  const approveUser = async (entry) => {
    if (!entry || !entry.email) return;
    
    try {
      setProcessingUser(entry.id);
      const auth = getAuth();
      const password = generatePassword();
      
      // Create a new user account
      const userCredential = await createUserWithEmailAndPassword(auth, entry.email, password);
      const uid = userCredential.user.uid;
      
      // Add user to approved_users collection
      await setDoc(doc(db, 'approved_users', uid), {
        email: entry.email,
        approvedAt: new Date(),
        waitlistId: entry.id,
        name: entry.name || '',
        phone: entry.phone || '',
        isApproved: true
      });
      
      // Update waitlist entry status
      await updateDoc(doc(db, 'waitlist', entry.id), {
        status: 'approved',
        approvedAt: new Date(),
        uid: uid,
        tempPassword: password // Store the temporary password for admin reference
      });
      
      alert(`User ${entry.email} has been approved! Temporary password: ${password}\n\nPlease save this password and send it to the user.`);
    } catch (error) {
      console.error('Error approving user:', error);
      alert(`Error approving user: ${error.message}`);
    } finally {
      setProcessingUser(null);
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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Waitlist Entries</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {waitlistEntries.length} people have joined the waitlist
          </p>
        </div>
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
                      {entry.timestamp.toLocaleDateString()} {entry.timestamp.toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      entry.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : entry.status === 'contacted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.status !== 'approved' ? (
                      <button
                        onClick={() => approveUser(entry)}
                        disabled={processingUser === entry.id}
                        className={`px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors ${
                          processingUser === entry.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {processingUser === entry.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          'Approve'
                        )}
                      </button>
                    ) : (
                      <div className="text-green-600 font-medium">Approved</div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  No waitlist entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WaitlistTable;