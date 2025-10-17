'use client';

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

export default function CustomerSearchBootstrapPage() {
  const [email, setEmail] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Function to format phone numbers
  const formatPhoneNumber = (phoneNumber: string | undefined): string => {
    if (!phoneNumber) return '-';
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.length === 10) {
      // 10 digits: 2128517046 -> 21285 17046
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // 11 digits starting with 1: 12128517046 -> +1 21285 17046
      return `+1 ${digits.slice(1, 6)} ${digits.slice(6)}`;
    } else if (digits.length === 12) {
      // 12 digits: 912128517046 -> +91 21285 17046
      return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
    } else {
      // For other formats, return as is
      return phoneNumber;
    }
  };

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login-bootstrap');
        }
      })
      .catch(() => router.push('/login-bootstrap'));
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
    router.push('/login-bootstrap');
  };

  if (!user) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-light)' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ background: 'var(--bg-light)' }}>
      {/* Header */}
      <header 
        className="bg-primary text-white shadow-sm"
        style={{
          background: 'var(--gradient-primary)'
        }}
      >
        <div className="container-fluid" style={{ paddingLeft: '3.5rem', paddingRight: '3.5rem' }}>
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h2 className="text-white fw-bold mb-0" style={{ fontFamily: 'var(--font-primary)', fontSize: '1.65rem' }}>
                Direct Lookup
              </h2>
              <p className="text-white-50 mb-0" style={{ fontSize: '0.99em' }}>
                Search by email address
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                onClick={() => router.push('/search-bootstrap')}
                className="btn btn-outline-light"
                style={{ fontSize: '1.1em' }}
              >
                <i className="fas fa-search me-2"></i>
                Advanced Search
              </button>
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin-bootstrap')}
                  className="btn btn-outline-light"
                  style={{ fontSize: '1.1em' }}
                >
                  <i className="fas fa-cog me-2"></i>
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="btn btn-outline-light"
                style={{ fontSize: '1.1em' }}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4">
        <div className="row g-4">
          {/* Left Column - Search Form (30%) */}
          <div className="col-lg-3">
            <div className="card shadow-sm">
              <div 
                className="card-header border-0 p-4"
                style={{
                  background: 'var(--gradient-primary)',
                  borderRadius: '16px 16px 0 0'
                }}
              >
                <div className="d-flex align-items-center">
                  <i className="fas fa-user text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                    Customer Lookup
                  </h5>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-envelope text-muted me-2"></i>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="Enter customer email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={loading}
                    style={{ 
                      padding: '12px 16px', 
                      fontSize: '1rem',
                      borderRadius: '12px',
                      border: '2px solid #e9ecef'
                    }}
                  />
                </div>
                
                {error && (
                  <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <span>{error}</span>
                  </div>
                )}

                <div className="d-grid gap-2 mb-3">
                  <button
                    onClick={handleSearch}
                    disabled={loading || !email.trim()}
                    className="btn btn-primary"
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '1rem',
                      borderRadius: '12px',
                      background: 'var(--gradient-primary)',
                      border: 'none'
                    }}
                  >
                    {loading ? (
                      <div className="d-flex align-items-center justify-content-center">
                        <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                        Searching...
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center">
                        <i className="fas fa-search me-2"></i>
                        Search
                      </div>
                    )}
                  </button>
                  <button
                    onClick={handleClear}
                    className="btn btn-outline-secondary"
                    disabled={loading}
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '1rem',
                      borderRadius: '12px'
                    }}
                  >
                    <i className="fas fa-times me-2"></i>
                    Clear
                  </button>
                </div>
                
                <div className="alert alert-info d-flex align-items-start">
                  <i className="fas fa-info-circle text-primary mt-1 me-2"></i>
                  <div>
                    <p className="mb-0 small">
                      Enter the customer's email address to search for their complete profile information including personal, professional, and contact details.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Customer Details (70%) */}
          <div className="col-lg-9">
            {customer ? (
              <div className="card shadow-sm">
                <div 
                  className="card-header border-0 p-4"
                  style={{
                    background: 'var(--gradient-primary)',
                    borderRadius: '16px 16px 0 0'
                  }}
                >
                  <div className="text-center">
                    <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                      Customer Profile
                    </h5>
                    <div className="mt-2">
                      <span className="badge bg-white text-primary fs-6">
                        {customer.salutation} {customer.firstName} {customer.lastName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="row g-4">
                    {/* Personal Information */}
                    <div className="col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                            <i className="fas fa-user text-primary me-2"></i>
                            Personal Information
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Full Name</label>
                              <p className="fw-semibold text-dark mb-0">
                                {customer.salutation} {customer.firstName} {customer.lastName}
                              </p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Email Address</label>
                              <p className="fw-semibold text-dark mb-0">{customer.email || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Phone</label>
                              <p className="fw-semibold text-dark mb-0">{formatPhoneNumber(customer.phone)}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Mobile Phone</label>
                              <p className="fw-semibold text-dark mb-0">{formatPhoneNumber(customer.mobilePhone)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                            <i className="fas fa-briefcase text-success me-2"></i>
                            Professional Information
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Company</label>
                              <p className="fw-semibold text-dark mb-0">{customer.company || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Job Title</label>
                              <span className="badge bg-light text-dark border">
                                {customer.jobTitle || '-'}
                              </span>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Job Title Level</label>
                              <span className="badge bg-light text-dark border">
                                {customer.jobTitleLevel || '-'}
                              </span>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Department</label>
                              <span className="badge bg-light text-dark border">
                                {customer.department || '-'}
                              </span>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Industry</label>
                              <span className="badge bg-light text-dark border">
                                {customer.industry || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location & Company Size */}
                    <div className="col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                            <i className="fas fa-map-marker-alt text-purple me-2"></i>
                            Location & Company Size
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Address</label>
                              <p className="fw-semibold text-dark mb-0">{customer.address || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">City</label>
                              <p className="fw-semibold text-dark mb-0">{customer.city || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">State</label>
                              <p className="fw-semibold text-dark mb-0">{customer.state || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Country</label>
                              <p className="fw-semibold text-dark mb-0">{customer.country || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">ZIP Code</label>
                              <p className="fw-semibold text-dark mb-0">{customer.zipCode || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Employee Size</label>
                              <p className="fw-semibold text-dark mb-0">
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
                    </div>

                    {/* Additional Information */}
                    <div className="col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                            <i className="fas fa-info-circle text-muted me-2"></i>
                            Additional Information
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">External Source</label>
                              <p className="fw-semibold text-dark mb-0">{customer.externalSource || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">External ID</label>
                              <p className="fw-semibold text-dark mb-0">{customer.externalId || '-'}</p>
                            </div>
                            {customer.jobTitleLink && (
                              <div className="col-12">
                                <label className="form-label small fw-semibold text-muted">Job Title Link</label>
                                <a 
                                  href={customer.jobTitleLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                                >
                                  <i className="fas fa-external-link-alt me-2"></i>
                                  View LinkedIn Profile
                                </a>
                              </div>
                            )}
                            {customer.employeeSizeLink && (
                              <div className="col-12">
                                <label className="form-label small fw-semibold text-muted">Employee Size Link</label>
                                <a 
                                  href={customer.employeeSizeLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                                >
                                  <i className="fas fa-external-link-alt me-2"></i>
                                  View Company Profile
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <div className="mb-4">
                    <i className="fas fa-search text-muted" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h5 className="fw-semibold text-dark mb-2">
                    No Customer Selected
                  </h5>
                  <p className="text-muted mb-0">
                    Enter a customer email address in the search form to view their details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
