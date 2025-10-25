'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProfileDropdown from '@/components/ProfileDropdown';
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
      fontFamily: 'var(--font-primary, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)'
    }}>
      {/* Header */}
      <div className="container-fluid py-4">
        <div className="row align-items-center">
          <div className="col">
            <div className="d-flex align-items-center">
              <div className="me-4">
                <h1 className="text-white fw-bold mb-0" style={{ fontFamily: 'var(--font-primary)', fontSize: '2rem' }}>
                  <i className="fas fa-building me-3"></i>
                  HailMary
                </h1>
              </div>
            </div>
          </div>
          <div className="col-auto">
            <div className="d-flex gap-2 align-items-center">
              {/* Company Dropdown */}
              <div className="dropdown">
                <button
                  className="btn btn-outline-light dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style={{ fontSize: '1.1em' }}
                >
                  <i className="fas fa-building me-2"></i>
                  Company
                </button>
                <ul className="dropdown-menu" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }}>
                  <li>
                    <button 
                      className="dropdown-item text-white"
                      onClick={() => router.push('/company-search')}
                      style={{ 
                        background: 'transparent',
                        border: 'none',
                        transition: 'background-color 0.2s ease',
                        padding: '12px 20px',
                        minHeight: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.95em'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-building me-2"></i>
                      Company Search
                    </button>
                  </li>
                </ul>
              </div>

              {/* Prospect Dropdown */}
              <div className="dropdown">
                <button
                  className="btn btn-outline-light dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style={{ fontSize: '1.1em' }}
                >
                  <i className="fas fa-user me-2"></i>
                  Prospect
                </button>
                <ul className="dropdown-menu" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }}>
                  <li>
                    <button 
                      className="dropdown-item text-white"
                      onClick={() => router.push('/direct-search')}
                      style={{ 
                        background: 'transparent',
                        border: 'none',
                        transition: 'background-color 0.2s ease',
                        padding: '12px 20px',
                        minHeight: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.95em'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-user me-2"></i>
                      Direct Search
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item text-white"
                      onClick={() => router.push('/search')}
                      style={{ 
                        background: 'transparent',
                        border: 'none',
                        transition: 'background-color 0.2s ease',
                        padding: '12px 20px',
                        minHeight: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.95em'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-search me-2"></i>
                      Advanced Search
                    </button>
                  </li>
                </ul>
              </div>

              {user && <ProfileDropdown user={user} onLogout={handleLogout} />}
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-lg border-0" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              {/* Header */}
              <div className="card-header text-center py-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}>
                <div>
                  <h2 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-primary)', fontSize: '1.65rem' }}>
                    Company Search
                  </h2>
                  <p className="text-white-50 mb-0" style={{ fontSize: '0.99em' }}>
                    Search for company details and associated prospects
                  </p>
                </div>
              </div>

              {/* Search Form */}
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">
                      <i className="fas fa-building text-primary me-2"></i>
                      Company Name
                    </label>
                    <TypeAheadInputBootstrapMultiSelect
                      value={companyName ? [companyName] : []}
                      onChange={handleCompanyNameChange}
                      field="company"
                      placeholder="Enter company name..."
                      className="form-control"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">
                      <i className="fas fa-globe text-primary me-2"></i>
                      Domain
                    </label>
                    <TypeAheadInputBootstrapMultiSelect
                      value={domain ? [domain] : []}
                      onChange={handleDomainChange}
                      field="domain"
                      placeholder="Enter company domain..."
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="d-grid gap-2 mt-4">
                  <button
                    onClick={handleSearch}
                    disabled={loading || (!companyName.trim() && !domain.trim())}
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
                        Search Company
                      </div>
                    )}
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
              <div className="card shadow-lg border-0 mt-4" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                <div className="card-header" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-building text-white me-3" style={{ fontSize: '18px' }}></i>
                    <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
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

            {/* Prospects Table */}
            {prospects.length > 0 && (
              <div className="card shadow-lg border-0 mt-4" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                <div className="card-header" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-users text-white me-3" style={{ fontSize: '18px' }}></i>
                      <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
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
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead style={{ marginTop: '0' }}>
                        <tr>
                          <th className="fw-bold text-center" style={{ width: '60px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-hashtag me-2"></i>
                          </th>
                          <th className="fw-bold text-center" style={{ width: '180px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-user me-2"></i>Name
                          </th>
                          <th className="fw-bold text-center" style={{ width: '160px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-briefcase me-2"></i>Job Title
                          </th>
                          <th className="fw-bold text-center" style={{ width: '120px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-layer-group me-2"></i>Job Level
                          </th>
                          <th className="fw-bold text-center" style={{ width: '140px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-sitemap me-2"></i>Department
                          </th>
                          <th className="fw-bold text-center" style={{ width: '180px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-map-marker-alt me-2"></i>Location
                          </th>
                          <th className="fw-bold text-center" style={{ width: '200px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-envelope me-2"></i>Email
                          </th>
                          <th className="fw-bold text-center" style={{ width: '150px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                            <i className="fas fa-phone me-2"></i>Phone
                          </th>
                          <th className="fw-bold text-center" style={{ width: '100px', whiteSpace: 'nowrap', fontSize: '11px' }}>
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
                              <div className="fw-semibold text-dark">{prospect.jobTitle || '-'}</div>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <div className="fw-semibold text-dark">{prospect.jobTitleLevel || '-'}</div>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <div className="fw-semibold text-dark">{prospect.department || '-'}</div>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <div className="fw-semibold text-dark">
                                {[prospect.city, prospect.state, prospect.country]
                                  .filter(Boolean)
                                  .join(', ') || '-'}
                              </div>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <div className="fw-semibold text-dark">
                                {prospect.email ? (
                                  <a href={`mailto:${prospect.email}`} className="text-primary text-decoration-none">
                                    {prospect.email}
                                  </a>
                                ) : '-'}
                              </div>
                            </td>
                            <td className="text-center" style={{ fontSize: '11px' }}>
                              <div className="fw-semibold text-dark">
                                {prospect.phone || prospect.mobilePhone ? (
                                  <a 
                                    href={`tel:${prospect.phone || prospect.mobilePhone}`} 
                                    className="text-primary text-decoration-none"
                                  >
                                    {formatPhoneNumber(prospect.phone || prospect.mobilePhone)}
                                  </a>
                                ) : '-'}
                              </div>
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
            )}
          </div>
        </div>
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
