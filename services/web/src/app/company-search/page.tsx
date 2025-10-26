'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import TypeAheadInputBootstrapMultiSelect from '@/components/TypeAheadInputBootstrapMultiSelect';

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

// Utility functions to serialize/deserialize company search state to/from URL
function serializeCompanySearchToUrl(companyName: string, domain: string): string {
  const params = new URLSearchParams();
  
  if (companyName.trim()) {
    params.set('company', companyName.trim());
  }
  
  if (domain.trim()) {
    params.set('domain', domain.trim());
  }
  
  return params.toString();
}

function deserializeCompanySearchFromUrl(searchParams: URLSearchParams): { companyName: string; domain: string } {
  return {
    companyName: searchParams.get('company') || '',
    domain: searchParams.get('domain') || ''
  };
}

interface CompanyDetails {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  minEmployeeSize?: number;
  maxEmployeeSize?: number;
  revenue?: number;
  description?: string;
  website?: string;
  linkedinUrl?: string;
  externalSource?: string;
  externalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Prospect {
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

function CompanySearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize from URL parameters
  const { companyName: initialCompanyName, domain: initialDomain } = deserializeCompanySearchFromUrl(searchParams);
  
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [domain, setDomain] = useState(initialDomain);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
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

  // Auto-search when component loads with parameters in URL
  useEffect(() => {
    if (initialCompanyName.trim() || initialDomain.trim()) {
      handleSearch();
    }
  }, []); // Only run once on mount

  // Update URL when inputs change
  useEffect(() => {
    const urlParams = serializeCompanySearchToUrl(companyName, domain);
    const newUrl = urlParams ? `?${urlParams}` : '/company-search';
    
    // Only update URL if it's different from current URL
    if (window.location.search !== (urlParams ? `?${urlParams}` : '')) {
      router.replace(newUrl, { scroll: false });
    }
  }, [companyName, domain, router]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const { companyName: newCompanyName, domain: newDomain } = deserializeCompanySearchFromUrl(new URLSearchParams(window.location.search));
      setCompanyName(newCompanyName);
      setDomain(newDomain);
      
      // Perform search if there are parameters
      if (newCompanyName.trim() || newDomain.trim()) {
        handleSearch();
      } else {
        setCompanyDetails(null);
        setProspects([]);
        setError('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSearch = async () => {
    if (!companyName.trim() && !domain.trim()) {
      setError('Please enter either a company name or domain');
      return;
    }

    setLoading(true);
    setError('');
    setCompanyDetails(null);
    setProspects([]);

    try {
      const requestBody: any = {};
      
      if (companyName.trim()) {
        requestBody.companyName = companyName.trim();
      }
      
      if (domain.trim()) {
        requestBody.domain = domain.trim();
      }

      const response = await fetch('/api/company-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyDetails(data.company);
        setProspects(data.prospects || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Company not found');
        setCompanyDetails(null);
        setProspects([]);
      }
    } catch (error) {
      console.error('Company search error:', error);
      setError('An error occurred while searching for the company');
      setCompanyDetails(null);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => router.push('/login'))
      .catch(() => router.push('/login'));
  };

  const handleCompanyNameChange = (values: string[]) => {
    const value = values[0] || '';
    setCompanyName(value);
    if (value.trim()) {
      setDomain(''); // Clear domain when company name is selected
    }
  };

  const handleDomainChange = (values: string[]) => {
    const value = values[0] || '';
    setDomain(value);
    if (value.trim()) {
      setCompanyName(''); // Clear company name when domain is selected
    }
  };

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
      `}</style>
      <Header
        title="Company Direct Lookup"
        subtitle="Search by company name or domain"
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
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-lg" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Header */}
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
                  <i className="fas fa-building text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 text-white" style={{ 
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Company Search
                  </h5>
                </div>
              </div>

              {/* Search Form */}
              <div className="card-body p-3">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" style={{ 
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#fff'
                    }}>
                      <i className="fas fa-building me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Company Name
                    </label>
                    <TypeAheadInputBootstrapMultiSelect
                      value={companyName ? [companyName] : []}
                      onChange={handleCompanyNameChange}
                      field="company"
                      placeholder="Enter company name..."
                      className="form-control form-control-lg"
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
                  <div className="col-md-6">
                    <label className="form-label" style={{ 
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#fff'
                    }}>
                      <i className="fas fa-globe me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Domain
                    </label>
                    <TypeAheadInputBootstrapMultiSelect
                      value={domain ? [domain] : []}
                      onChange={handleDomainChange}
                      field="domain"
                      placeholder="Enter company domain..."
                      className="form-control form-control-lg"
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
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button
                    onClick={handleSearch}
                    disabled={loading || (!companyName.trim() && !domain.trim())}
                    className="btn btn-primary search-btn flex-fill"
                    style={{ 
                      padding: '12px 16px', 
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#fff',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #20c997 0%, #17a2b8 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(32, 201, 151, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      width: '50%'
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
                        Search Company
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setCompanyName('');
                      setDomain('');
                      setCompanyDetails(null);
                      setProspects([]);
                      setError('');
                    }}
                    className="btn clear-btn flex-fill"
                    style={{ 
                      padding: '12px 16px', 
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#fff',
                      borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid rgba(102, 126, 234, 0.3)',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      width: '50%'
                    }}
                  >
                    <i className="fas fa-times me-2"></i>
                    Clear
                  </button>
                </div>

                {error && (
                  <div className="alert alert-danger mt-3" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Company Details */}
            {companyDetails && (
              <div className="card shadow-lg mt-4" style={{
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
                    <i className="fas fa-building text-white me-3" style={{ fontSize: '18px' }}></i>
                    <h5 className="mb-0 text-white" style={{ 
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      Company Details
                    </h5>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Company Name</label>
                        <div className="fw-semibold text-dark">{companyDetails.name || '-'}</div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Domain</label>
                        <div className="fw-semibold text-dark">{companyDetails.domain || '-'}</div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Industry</label>
                        <div className="fw-semibold text-dark">{companyDetails.industry || '-'}</div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Website</label>
                        <div className="fw-semibold text-dark">
                          {companyDetails.website ? (
                            <a href={companyDetails.website} target="_blank" rel="noopener noreferrer" className="text-primary">
                              {companyDetails.website}
                            </a>
                          ) : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Address</label>
                        <div className="fw-semibold text-dark">
                          {[companyDetails.address, companyDetails.city, companyDetails.state, companyDetails.country, companyDetails.zipCode]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Phone</label>
                        <div className="fw-semibold text-dark">
                          {companyDetails.phone ? (
                            <a href={`tel:${companyDetails.phone}`} className="text-primary text-decoration-none">
                              {formatPhoneNumber(companyDetails.phone)}
                            </a>
                          ) : '-'}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Employee Size</label>
                        <div className="fw-semibold text-dark">
                          {companyDetails.minEmployeeSize && companyDetails.maxEmployeeSize
                            ? `${companyDetails.minEmployeeSize.toLocaleString()} - ${companyDetails.maxEmployeeSize.toLocaleString()}`
                            : companyDetails.minEmployeeSize
                            ? `${companyDetails.minEmployeeSize.toLocaleString()}+`
                            : '-'}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Revenue</label>
                        <div className="fw-semibold text-dark">{formatRevenue(companyDetails.revenue)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Width Prospects Table */}
        {prospects.length > 0 && (
          <div className="row mt-4">
            <div className="col-12">
              <div className="card shadow-lg mt-4" style={{
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
                    <div className="d-flex align-items-center">
                      <i className="fas fa-users text-white me-3" style={{ fontSize: '18px' }}></i>
                      <h5 className="mb-0 text-white" style={{ 
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        Associated Prospects
                      </h5>
                    </div>
                    <div className="text-end">
                      <div className="badge bg-white text-primary">
                        {prospects.length.toLocaleString()} prospects
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="card shadow-sm" style={{ 
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div className="table-responsive" style={{ borderRadius: '16px', overflowX: 'auto', overflowY: 'hidden' }}>
                      <table className="table table-hover mb-0" style={{ 
                        minWidth: '1200px', 
                        marginBottom: '0', 
                        marginTop: '0',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px'
                      }}>
                      <thead style={{ marginTop: '0' }}>
                        <tr>
                          <th className="text-center" style={{ 
                            width: '60px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-hashtag me-2"></i>
                          </th>
                          <th className="text-center" style={{ 
                            width: '180px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-user me-2"></i>Name
                          </th>
                          <th className="text-center" style={{ 
                            width: '160px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-briefcase me-2"></i>Job Title
                          </th>
                          <th className="text-center" style={{ 
                            width: '120px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-layer-group me-2"></i>Job Level
                          </th>
                          <th className="text-center" style={{ 
                            width: '140px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-sitemap me-2"></i>Department
                          </th>
                          <th className="text-center" style={{ 
                            width: '200px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-map-marker-alt me-2"></i>Location
                          </th>
                          <th className="text-center" style={{ 
                            width: '200px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-envelope me-2"></i>Email
                          </th>
                          <th className="text-center" style={{ 
                            width: '150px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-phone me-2"></i>Phone
                          </th>
                          <th className="text-center" style={{ 
                            width: '100px', 
                            whiteSpace: 'nowrap', 
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#444'
                          }}>
                            <i className="fas fa-eye me-2"></i>Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {prospects.map((prospect, index) => (
                          <tr key={prospect.id} className="align-middle">
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <span className="text-muted fw-medium">{index + 1}</span>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <div className="fw-semibold text-dark">
                                {[prospect.salutation, prospect.firstName, prospect.lastName]
                                  .filter(Boolean)
                                  .join(' ') || '-'}
                              </div>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <span className="text-dark">{prospect.jobTitle || '-'}</span>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <span className="text-dark">{prospect.jobTitleLevel || '-'}</span>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <span className="text-dark">{prospect.department || '-'}</span>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <span className="text-dark">
                                {[prospect.city, prospect.state, prospect.country]
                                  .filter(Boolean)
                                  .join(', ') || '-'}
                              </span>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <span className="text-dark">
                                {prospect.email ? (
                                  <a href={`mailto:${prospect.email}`} className="text-primary text-decoration-none">
                                    {prospect.email}
                                  </a>
                                ) : '-'}
                              </span>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <span className="text-dark">
                                {prospect.phone || prospect.mobilePhone ? (
                                  <a 
                                    href={`tel:${prospect.phone || prospect.mobilePhone}`} 
                                    className="text-primary text-decoration-none"
                                  >
                                    {formatPhoneNumber(prospect.phone || prospect.mobilePhone)}
                                  </a>
                                ) : '-'}
                              </span>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <button
                                onClick={() => router.push(`/direct-search?email=${encodeURIComponent(prospect.email || '')}`)}
                                className="btn btn-sm btn-outline-primary"
                                disabled={!prospect.email}
                                style={{ 
                                  fontSize: '10px',
                                  padding: '4px 12px',
                                  borderWidth: '1px',
                                  borderRadius: '50px'
                                }}
                                title={prospect.email ? "View detailed information" : "No email available"}
                              >
                                <i className="fas fa-eye me-1"></i>
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompanySearchPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading company search page...</p>
        </div>
      </div>
    }>
      <CompanySearchPageContent />
    </Suspense>
  );
}
