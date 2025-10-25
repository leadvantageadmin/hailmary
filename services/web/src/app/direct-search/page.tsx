'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProfileDropdown from '@/components/ProfileDropdown';

// Utility function to format revenue from whole dollars to display format
function formatRevenue(revenue: number | null | undefined): string {
  if (!revenue || revenue === 0) {
    return 'NA';
  }
  
  if (revenue >= 1000000000) {
    // Billions
    const billions = revenue / 1000000000;
    return `${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)}B`;
  } else if (revenue >= 1000000) {
    // Millions
    const millions = revenue / 1000000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  } else if (revenue >= 1000) {
    // Thousands
    const thousands = revenue / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  } else {
    // Less than 1000
    return `$${revenue.toFixed(0)}`;
  }
}

// Utility functions to serialize/deserialize direct search state to/from URL
function serializeDirectSearchToUrl(email: string): string {
  const params = new URLSearchParams();
  
  if (email.trim()) {
    params.set('email', email.trim());
  }
  
  return params.toString();
}

function deserializeDirectSearchFromUrl(searchParams: URLSearchParams): string {
  return searchParams.get('email') || '';
}

interface DirectSearchResult {
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
  revenue?: number;
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

export default function DirectSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize email from URL parameters
  const initialEmail = deserializeDirectSearchFromUrl(searchParams);
  
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<DirectSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

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
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Auto-search when component loads with email in URL
  useEffect(() => {
    if (initialEmail.trim()) {
      handleSearch();
    }
  }, []); // Only run once on mount

  // Update URL when email changes
  useEffect(() => {
    const urlParams = serializeDirectSearchToUrl(email);
    const newUrl = urlParams ? `?${urlParams}` : '/direct-search';
    
    // Only update URL if it's different from current URL
    if (window.location.search !== (urlParams ? `?${urlParams}` : '')) {
      router.replace(newUrl, { scroll: false });
    }
  }, [email, router]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newEmail = deserializeDirectSearchFromUrl(new URLSearchParams(window.location.search));
      setEmail(newEmail);
      
      // Perform search if there's an email
      if (newEmail.trim()) {
        handleSearch();
      } else {
        setResult(null);
        setError('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/customer/${encodeURIComponent(email.trim())}`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(data.customer);
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
    setResult(null);
    setError('');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
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
              <h2 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-primary)', fontSize: '1.65rem' }}>
                Direct Lookup
              </h2>
              <p className="text-white-50 mb-0" style={{ fontSize: '0.99em' }}>
                Search by email address
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <button
                onClick={() => router.push('/search')}
                className="btn btn-outline-light"
                style={{ fontSize: '1.1em' }}
              >
                <i className="fas fa-search me-2"></i>
                Advanced Search
              </button>
              {user && <ProfileDropdown user={user} onLogout={handleLogout} />}
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
                    Direct Lookup
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
                      Enter the prospects's email address to search for their complete profile information including personal, professional, and contact details.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Customer Details (70%) */}
          <div className="col-lg-9">
                    {result ? (
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
                      Direct Search Profile
                    </h5>
                    <div className="mt-2">
                      <span className="badge bg-white text-primary fs-6">
                        {result.salutation} {result.firstName} {result.lastName}
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
                                {result.salutation} {result.firstName} {result.lastName}
                              </p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Email Address</label>
                              <p className="fw-semibold text-dark mb-0">{result.email || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Phone</label>
                              <p className="fw-semibold text-dark mb-0">{formatPhoneNumber(result.phone)}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Mobile Phone</label>
                              <p className="fw-semibold text-dark mb-0">{formatPhoneNumber(result.mobilePhone)}</p>
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
                              <p className="fw-semibold text-dark mb-0">{result.company || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Job Title</label>
                              <span className="badge bg-light text-dark border">
                                {result.jobTitle || '-'}
                              </span>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Job Title Level</label>
                              <span className="badge bg-light text-dark border">
                                {result.jobTitleLevel || '-'}
                              </span>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Department</label>
                              <span className="badge bg-light text-dark border">
                                {result.department || '-'}
                              </span>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Industry</label>
                              <span className="badge bg-light text-dark border">
                                {result.industry || '-'}
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
                              <p className="fw-semibold text-dark mb-0">{result.address || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">City</label>
                              <p className="fw-semibold text-dark mb-0">{result.city || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">State</label>
                              <p className="fw-semibold text-dark mb-0">{result.state || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Country</label>
                              <p className="fw-semibold text-dark mb-0">{result.country || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">ZIP Code</label>
                              <p className="fw-semibold text-dark mb-0">{result.zipCode || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Employee Size</label>
                              <p className="fw-semibold text-dark mb-0">
                                {(() => {
                                  const minSize = result.minEmployeeSize;
                                  const maxSize = result.maxEmployeeSize;
                                  
                                  if (!minSize && !maxSize) return '-';
                                  if (minSize && maxSize) return `${minSize}-${maxSize}`;
                                  if (minSize && !maxSize) return `${minSize}+`;
                                  return '-';
                                })()}
                              </p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Revenue</label>
                              <p className="fw-semibold text-dark mb-0">
                                <i className="fas fa-dollar-sign text-muted me-2"></i>
                                {formatRevenue(result.revenue)}
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
                              <p className="fw-semibold text-dark mb-0">{result.externalSource || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">External ID</label>
                              <p className="fw-semibold text-dark mb-0">{result.externalId || '-'}</p>
                            </div>
                            {result.jobTitleLink && (
                              <div className="col-12">
                                <label className="form-label small fw-semibold text-muted">Job Title Link</label>
                                <a 
                                  href={result.jobTitleLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                                >
                                  <i className="fas fa-external-link-alt me-2"></i>
                                  View LinkedIn Profile
                                </a>
                              </div>
                            )}
                            {result.employeeSizeLink && (
                              <div className="col-12">
                                <label className="form-label small fw-semibold text-muted">Employee Size Link</label>
                                <a 
                                  href={result.employeeSizeLink} 
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
                    No Result Selected
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
