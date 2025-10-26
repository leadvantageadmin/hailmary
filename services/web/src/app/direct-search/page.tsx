'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';

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
  companyDomain?: string;
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

function DirectSearchPageContent() {
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
    <div className="min-vh-100" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glass morphism background elements */}
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{
        background: `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
        `,
        filter: 'blur(1px)'
      }}></div>
      
      {/* CSS for typography and hover effects */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        
        * {
          font-family: 'Inter', sans-serif;
        }
        
        /* Ensure FontAwesome icons are not affected by font-family */
        .fas, .far, .fab, .fal, .fad, .fa, i[class*="fa-"] {
          font-family: "Font Awesome 6 Free", "Font Awesome 6 Pro", "Font Awesome 6 Brands" !important;
          font-style: normal !important;
          font-variant: normal !important;
          text-rendering: auto !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
        }
        
        body {
          font-size: 14px;
          font-weight: 400;
          color: #333;
        }
        .search-btn:hover {
          background: linear-gradient(135deg, #1dd1a1 0%, #0ea5e9 100%) !important;
          box-shadow: 0 6px 25px rgba(32, 201, 151, 0.6) !important;
          transform: translateY(-2px);
        }
        .search-btn:active {
          transform: translateY(0px);
        }
        .form-control:focus {
          border-color: #20c997 !important;
          box-shadow: 0 0 0 0.2rem rgba(32, 201, 151, 0.25) !important;
        }
        .clear-btn:hover {
          background: rgba(102, 126, 234, 0.1) !important;
          border-color: rgba(102, 126, 234, 0.5) !important;
          color: #000 !important;
        }
        .sortable-header:hover {
          color: #20c997 !important;
        }
        .sortable-header:hover .fas.fa-sort {
          opacity: 1 !important;
        }
        .table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .table tbody tr:hover {
          background-color: #e8f4fd !important;
        }
        .card:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transform: translateY(-1px);
          transition: all 0.3s ease;
        }
        .dropdown-item:hover {
          font-weight: 500 !important;
          color: #000 !important;
        }
        
        /* Header dropdown button hover and open states */
        .dropdown-toggle:hover,
        .dropdown-toggle.show {
          color: #000 !important;
        }
        
        .dropdown-toggle:hover *,
        .dropdown-toggle.show * {
          color: #000 !important;
        }
        .table td {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        .table td a {
          font-size: 14px;
          font-weight: 400;
          color: #007bff;
          text-decoration: none;
        }
        .table td a:hover {
          text-decoration: underline;
        }
        
        /* Table column headers */
        .table th {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background-color: #000;
          border-bottom: 2px solid #dee2e6;
        }
        
        /* Section label headers (accordion buttons) */
        .accordion-button {
          background-color: #000 !important;
          color: #fff !important;
          border: none !important;
        }
        
        .accordion-button:not(.collapsed) {
          background-color: #000 !important;
          color: #fff !important;
          box-shadow: none !important;
        }
        
        .accordion-button:focus {
          background-color: #000 !important;
          color: #fff !important;
          box-shadow: none !important;
        }
        
        /* Ensure all text and icons in accordion buttons are white */
        .accordion-button * {
          color: #fff !important;
        }
        
        .accordion-button i {
          color: #fff !important;
        }
        
        /* Ensure all text and icons in table headers are white */
        .table th {
          color: #fff !important;
        }
        
        .table th * {
          color: #fff !important;
        }
        
        .table th i {
          color: #fff !important;
        }
        
        .table th span {
          color: #fff !important;
        }
        
        /* Ensure accordion arrows are white */
        .accordion-button::after {
          filter: brightness(0) invert(1) !important;
        }
        
        .accordion-button:not(.collapsed)::after {
          filter: brightness(0) invert(1) !important;
        }
        
        /* Prevent phone column text wrapping */
        .table td:nth-child(9) {
          white-space: nowrap;
        }
        
        /* Pagination button styling to match glass morphism */
        .pagination .page-link {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #000 !important;
          border-radius: 8px !important;
          margin: 0 2px !important;
          transition: all 0.3s ease !important;
          padding: 8px 14px !important;
          font-size: 14px !important;
        }
        
        .pagination .page-link:hover {
          background: rgba(102, 126, 234, 0.2) !important;
          border-color: rgba(102, 126, 234, 0.3) !important;
          color: #000 !important;
          transform: translateY(-1px) !important;
        }
        
        .pagination .page-item.active .page-link {
          background: rgba(102, 126, 234, 0.3) !important;
          border-color: rgba(102, 126, 234, 0.5) !important;
          color: #000 !important;
          font-weight: 600 !important;
        }
        
        /* Ensure glass morphism effects are visible */
        .card {
          background: rgba(255, 255, 255, 0.2) !important;
          backdrop-filter: blur(15px) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
        }
        
        .card-header {
          background: rgba(102, 126, 234, 0.4) !important;
          backdrop-filter: blur(20px) !important;
        }
      `}</style>
      <Header
        title="Prospect Direct Lookup"
        subtitle="Search by email address"
        user={user}
        onLogout={handleLogout}
        companyDropdownItems={[
          {
            label: 'Direct Search',
            icon: 'fas fa-building',
            onClick: () => router.push('/company-search')
          }
        ]}
        prospectDropdownItems={[
          {
            label: 'Direct Search',
            icon: 'fas fa-user',
            onClick: () => router.push('/direct-search')
          },
          {
            label: 'Advanced Search',
            icon: 'fas fa-search',
            onClick: () => router.push('/search')
          }
        ]}
      />

      <div className="container-fluid py-4">
        <div className="row g-4">
          {/* Left Column - Search Form (30%) */}
          <div className="col-lg-3">
            <div className="card shadow-lg" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div 
                className="card-header border-0 p-4"
                style={{
                  background: 'rgba(102, 126, 234, 0.2)',
                  backdropFilter: 'blur(15px)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px 16px 0 0'
                }}
              >
                <div className="d-flex align-items-center">
                  <i className="fas fa-user text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 text-white" style={{ 
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Direct Lookup
                  </h5>
                </div>
              </div>
              <div className="card-body p-3">
                <div className="mb-3">
                  <label className="form-label" style={{ 
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#fff'
                  }}>
                    <i className="fas fa-envelope me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Email Address
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
                      fontSize: '14px',
                      fontWeight: '400',
                      color: '#333',
                      minHeight: '48px',
                      padding: '8px 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
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
                    className="btn btn-primary search-btn"
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#fff',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #20c997 0%, #17a2b8 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(32, 201, 151, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.3s ease'
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
                    className="btn clear-btn"
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#fff',
                      borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid rgba(102, 126, 234, 0.3)',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <i className="fas fa-times me-2"></i>
                    Clear
                  </button>
                </div>
                
              </div>
            </div>
          </div>

          {/* Right Column - Customer Details (70%) */}
          <div className="col-lg-9">
                    {result ? (
              <div className="card shadow-lg" style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <div 
                  className="card-header border-0 p-4"
                  style={{
                    background: 'rgba(102, 126, 234, 0.2)',
                    backdropFilter: 'blur(15px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px 16px 0 0'
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-center flex-grow-1">
                      <h5 className="mb-0 text-white" style={{ 
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Direct Search Profile
                      </h5>
                      <div className="mt-2">
                        <span className="badge bg-white text-primary fs-6">
                          {result.salutation} {result.firstName} {result.lastName}
                        </span>
                      </div>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
                      <button
                        onClick={() => router.push(`/edit-prospect?id=${result.id}`)}
                        className="btn btn-outline-light btn-sm"
                        style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          color: '#fff',
                          background: 'rgba(255, 255, 255, 0.1)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                      >
                        <i className="fas fa-edit me-1"></i>
                        Update Record
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="row g-4">
                    {/* Personal Information */}
                    <div className="col-md-6">
                      <div className="card h-100" style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}>
                        <div 
                          className="card-header border-0 p-3"
                          style={{
                            background: 'rgba(102, 126, 234, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '16px 16px 0 0'
                          }}
                        >
                          <h6 className="mb-0 text-white d-flex align-items-center" style={{ 
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#fff'
                          }}>
                            <i className="fas fa-user me-2" style={{ fontSize: '16px', color: '#fff' }}></i>
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
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="col-md-6">
                      <div className="card h-100" style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}>
                        <div 
                          className="card-header border-0 p-3"
                          style={{
                            background: 'rgba(102, 126, 234, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '16px 16px 0 0'
                          }}
                        >
                          <h6 className="mb-0 text-white d-flex align-items-center" style={{ 
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#fff'
                          }}>
                            <i className="fas fa-briefcase me-2" style={{ fontSize: '16px', color: '#fff' }}></i>
                            Professional Information
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Company Name</label>
                              <p className="fw-semibold text-dark mb-2">{result.company || '-'}</p>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-muted">Company Domain</label>
                              <div className="d-flex align-items-center justify-content-between">
                                <p className="fw-semibold text-dark mb-0 flex-grow-1">{result.companyDomain || '-'}</p>
                                {result.companyDomain && (
                                  <button
                                    onClick={() => {
                                      const companyDomain = result.companyDomain || '';
                                      router.push(`/company-search?domain=${encodeURIComponent(companyDomain)}`);
                                    }}
                                    className="btn btn-outline-primary btn-sm rounded-pill"
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      padding: '4px 12px',
                                      border: '1px solid #007bff',
                                      color: '#007bff',
                                      background: 'rgba(0, 123, 255, 0.1)',
                                      transition: 'all 0.3s ease',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#007bff';
                                      e.currentTarget.style.color = '#fff';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'rgba(0, 123, 255, 0.1)';
                                      e.currentTarget.style.color = '#007bff';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                  >
                                    <i className="fas fa-building me-1"></i>
                                    View Company
                                  </button>
                                )}
                              </div>
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

                    {/* Location */}
                    <div className="col-12">
                      <div className="card h-100" style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}>
                        <div 
                          className="card-header border-0 p-3"
                          style={{
                            background: 'rgba(102, 126, 234, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '16px 16px 0 0'
                          }}
                        >
                          <h6 className="mb-0 text-white d-flex align-items-center" style={{ 
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#fff'
                          }}>
                            <i className="fas fa-map-marker-alt me-2" style={{ fontSize: '16px', color: '#fff' }}></i>
                            Location
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-muted">Address</label>
                              <p className="fw-semibold text-dark mb-0">{result.address || '-'}</p>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label small fw-semibold text-muted">City</label>
                              <p className="fw-semibold text-dark mb-0">{result.city || '-'}</p>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label small fw-semibold text-muted">State</label>
                              <p className="fw-semibold text-dark mb-0">{result.state || '-'}</p>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-muted">Country</label>
                              <p className="fw-semibold text-dark mb-0">{result.country || '-'}</p>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-muted">ZIP Code</label>
                              <p className="fw-semibold text-dark mb-0">{result.zipCode || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="card shadow-lg" style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
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

export default function DirectSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading direct search page...</p>
        </div>
      </div>
    }>
      <DirectSearchPageContent />
    </Suspense>
  );
}
