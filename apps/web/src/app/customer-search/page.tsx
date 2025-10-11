'use client';
// Updated: 2024-10-11 12:20:00 - Fixed styling

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  id: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  mobilePhone?: string;
  industry?: string;
  jobTitleLevel?: string;
  jobTitle?: string;
  department?: string;
  minEmployeeSize?: number;
  maxEmployeeSize?: number;
  jobTitleLink?: string;
  employeeSizeLink?: string;
  externalSource?: string;
  externalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function CustomerSearchPage() {
  const [email, setEmail] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setCustomer(null);

    try {
      const response = await fetch(`/api/customer/${encodeURIComponent(email.trim())}`);
      
      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
      } else if (response.status === 404) {
        setError('Customer not found');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'An error occurred while searching');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setEmail('');
    setCustomer(null);
    setError('');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="container">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-user text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                  Customer Lookup
                </h1>
                <p className="text-sm text-white text-opacity-80">
                  Search by email address
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/search')}
                className="btn btn-secondary"
              >
                <i className="fas fa-search mr-2"></i>
                Advanced Search
              </button>
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="btn btn-secondary"
                >
                  <i className="fas fa-cog mr-2"></i>
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="page-content" style={{ maxWidth: '800px', padding: '40px 20px', margin: '0 auto' }}>
        <div className="animate-fade-in">
          {/* Search Section */}
          <div className="card animate-slide-in-up" style={{ width: '100%', maxWidth: '600px', margin: '0 auto 24px' }}>
            <div className="card-header" style={{ padding: '20px 20px 15px' }}>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-primary)' }}>
                  Customer Lookup
                </h2>
                <p className="text-sm text-gray-600">
                  Search for customer details by email address
                </p>
              </div>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <div className="space-y-4">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <i className="fas fa-envelope text-gray-500" style={{ fontSize: '14px', marginRight: '12px' }}></i>
                    Email Address
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      className="input"
                      placeholder="Enter customer email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      disabled={loading}
                      style={{ padding: '8px 12px', fontSize: '12px', height: '32px' }}
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="alert alert-error animate-fade-in" style={{ padding: '8px 12px', marginBottom: '12px' }}>
                    <div className="flex items-center">
                      <i className="fas fa-exclamation-triangle mr-2" style={{ fontSize: '12px' }}></i>
                      <span style={{ fontSize: '11px' }}>{error}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSearch}
                    disabled={loading || !email.trim()}
                    className="btn btn-primary flex-1"
                    style={{ padding: '8px 12px', fontSize: '12px', height: '32px' }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner h-3 w-3" style={{ marginRight: '8px' }}></div>
                        Searching...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <i className="fas fa-search" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Search
                      </div>
                    )}
                  </button>
                  <button
                    onClick={handleClear}
                    className="btn btn-secondary"
                    disabled={loading}
                    style={{ padding: '8px 12px', fontSize: '12px', height: '32px' }}
                  >
                    <i className="fas fa-times" style={{ fontSize: '10px', marginRight: '6px' }}></i>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section - Updated */}
          {customer && (
            <div className="card animate-slide-in-up" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <div className="card-header" style={{ padding: '20px 20px 15px' }}>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-primary)' }}>
                    Customer Details
                  </h2>
                  <p className="text-sm text-gray-600">
                    {customer.salutation} {customer.firstName} {customer.lastName}
                  </p>
                </div>
              </div>
              <div className="card-body" style={{ padding: '20px' }}>
                <div className="space-y-8" style={{ marginTop: '0' }}>
                  {/* Personal Information */}
                  <div style={{ backgroundColor: 'transparent', border: 'none', padding: '0', margin: '0' }}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <i className="fas fa-user text-blue-600 mr-2"></i>
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Full Name</label>
                        <p className="text-gray-900 font-medium">
                          {customer.salutation} {customer.firstName} {customer.lastName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Email Address</label>
                        <p className="text-gray-900 font-medium">{customer.email || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Phone</label>
                        <p className="text-gray-900 font-medium">{customer.phone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Mobile Phone</label>
                        <p className="text-gray-900 font-medium">{customer.mobilePhone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div style={{ backgroundColor: 'transparent', border: 'none', padding: '0', margin: '0' }}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <i className="fas fa-briefcase text-green-600 mr-2"></i>
                      Professional Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Company</label>
                        <p className="text-gray-900 font-medium">{customer.company || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Job Title</label>
                        <p className="text-gray-900 font-medium">{customer.jobTitle || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Job Title Level</label>
                        <p className="text-gray-900 font-medium">{customer.jobTitleLevel || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Department</label>
                        <p className="text-gray-900 font-medium">{customer.department || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Industry</label>
                        <p className="text-gray-900 font-medium">{customer.industry || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location & Company Size */}
                  <div style={{ backgroundColor: 'transparent', border: 'none', padding: '0', margin: '0' }}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <i className="fas fa-map-marker-alt text-purple-600 mr-2"></i>
                      Location & Company Size
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Address</label>
                        <p className="text-gray-900 font-medium">{customer.address || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">City</label>
                        <p className="text-gray-900 font-medium">{customer.city || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">State</label>
                        <p className="text-gray-900 font-medium">{customer.state || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Country</label>
                        <p className="text-gray-900 font-medium">{customer.country || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">ZIP Code</label>
                        <p className="text-gray-900 font-medium">{customer.zipCode || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Employee Size</label>
                        <p className="text-gray-900 font-medium">
                          {(() => {
                            const minSize = customer.minEmployeeSize;
                            const maxSize = customer.maxEmployeeSize;
                            
                            if (!minSize && !maxSize) return '-';
                            if (minSize && maxSize) return `${minSize}-${maxSize}`;
                            if (minSize && !maxSize) return `${minSize}+`;
                            return '-';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div style={{ backgroundColor: 'transparent', border: 'none', padding: '0', margin: '0' }}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i className="fas fa-info-circle text-gray-600 mr-2"></i>
                    Additional Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">External Source</label>
                      <p className="text-gray-900 font-medium">{customer.externalSource || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">External ID</label>
                      <p className="text-gray-900 font-medium">{customer.externalId || '-'}</p>
                    </div>
                    {customer.jobTitleLink && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Job Title Link</label>
                        <a 
                          href={customer.jobTitleLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                        >
                          <i className="fas fa-external-link-alt mr-1"></i>
                          View LinkedIn Profile
                        </a>
                      </div>
                    )}
                    {customer.employeeSizeLink && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Employee Size Link</label>
                        <a 
                          href={customer.employeeSizeLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                        >
                          <i className="fas fa-external-link-alt mr-1"></i>
                          View Company Profile
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
