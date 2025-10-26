'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TypeAheadInputBootstrapMultiSelect from '@/components/TypeAheadInputBootstrapMultiSelect';
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

// Function to format phone numbers
function formatPhoneNumber(phoneNumber: string | undefined): string {
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
}

// Utility functions to serialize/deserialize search state to/from URL
function serializeFiltersToUrl(filters: SearchFilters, pagination: Pagination): string {
  const params = new URLSearchParams();
  
  // Add filter arrays
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      params.set(key, value.join(','));
    } else if (typeof value === 'number' && value !== undefined) {
      params.set(key, value.toString());
    }
  });
  
  // Add pagination
  if (pagination.currentPage > 1) {
    params.set('page', pagination.currentPage.toString());
  }
  
  return params.toString();
}

function deserializeFiltersFromUrl(searchParams: URLSearchParams): { filters: SearchFilters; page: number } {
  const filters: SearchFilters = {
    company: [],
    country: [],
    city: [],
    state: [],
    jobTitle: [],
    jobTitleLevel: [],
    department: [],
    industry: [],
    minEmployeeSize: undefined,
    maxEmployeeSize: undefined
  };
  
  // Deserialize filter arrays
  Object.keys(filters).forEach(key => {
    const value = searchParams.get(key);
    if (value) {
      if (key === 'minEmployeeSize' || key === 'maxEmployeeSize') {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
          (filters as any)[key] = numValue;
        }
      } else {
        (filters as any)[key] = value.split(',').filter(Boolean);
      }
    }
  });
  
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  return { filters, page };
}

interface DirectSearchResult {
  id: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  companyDomain?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  mobilePhone?: string;
  jobTitle?: string;
  jobTitleLevel?: string;
  department?: string;
  industry?: string;
  revenue?: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface SearchFilters {
  company: string[];
  country: string[];
  city: string[];
  state: string[];
  jobTitle: string[];
  jobTitleLevel: string[];
  department: string[];
  industry: string[];
  minEmployeeSize?: number;
  maxEmployeeSize?: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchRef = useRef<number>(0);
  
  // Initialize state from URL parameters
  const { filters: initialFilters, page: initialPage } = deserializeFiltersFromUrl(searchParams);
  
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<DirectSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: initialPage,
    totalPages: 0,
    totalResults: 0,
    pageSize: 25
  });

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

  // Auto-search when component loads with URL parameters
  useEffect(() => {
    const hasFilters = Object.values(initialFilters).some(value => 
      Array.isArray(value) ? value.length > 0 : value !== undefined
    );
    
    if (hasFilters) {
      performSearch(initialPage);
    }
  }, []); // Only run once on mount

  // Update URL when filters or pagination change
  useEffect(() => {
    const urlParams = serializeFiltersToUrl(filters, pagination);
    const newUrl = urlParams ? `?${urlParams}` : '/search';
    
    // Only update URL if it's different from current URL
    if (window.location.search !== (urlParams ? `?${urlParams}` : '')) {
      router.replace(newUrl, { scroll: false });
    }
  }, [filters, pagination.currentPage, router]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const { filters: newFilters, page: newPage } = deserializeFiltersFromUrl(new URLSearchParams(window.location.search));
      setFilters(newFilters);
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      
      // Perform search if there are filters
      const hasFilters = Object.values(newFilters).some(value => 
        Array.isArray(value) ? value.length > 0 : value !== undefined
      );
      
      if (hasFilters) {
        performSearch(newPage);
      } else {
        setResults([]);
        setPagination(prev => ({ ...prev, totalPages: 0, totalResults: 0 }));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const performSearch = async (page: number = 1) => {
    const searchId = ++searchRef.current;
    setLoading(true);
    // Force clear results and reset pagination immediately
    setResults([]);
    setPagination(prev => ({ ...prev, currentPage: page }));
    try {
      const requestBody = {
        filters: {
          ...(filters.company.length > 0 && { company: filters.company }),
          ...(filters.country.length > 0 && { country: filters.country }),
          ...(filters.city.length > 0 && { city: filters.city }),
          ...(filters.state.length > 0 && { state: filters.state }),
          ...(filters.jobTitle.length > 0 && { jobTitle: filters.jobTitle }),
          ...(filters.jobTitleLevel.length > 0 && { jobTitleLevel: filters.jobTitleLevel }),
          ...(filters.department.length > 0 && { department: filters.department }),
          ...(filters.industry.length > 0 && { industry: filters.industry }),
          ...(filters.minEmployeeSize && { minEmployeeSize: [filters.minEmployeeSize] }),
          ...(filters.maxEmployeeSize && { maxEmployeeSize: [filters.maxEmployeeSize] }),
        },
        page: {
          size: 25,
          number: page
        }
      };
      
      console.log('Search request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Search response for page', page, ':', data);
        console.log('Items count:', data.items?.length || 0);
        
        // Only update state if this is still the latest search
        if (searchId === searchRef.current) {
          setResults(data.items || []);
          setPagination({
            currentPage: data.pagination?.currentPage || 1,
            totalPages: data.pagination?.totalPages || 0,
            totalResults: data.pagination?.totalItems || 0,
            pageSize: data.pagination?.pageSize || 25
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Search failed:', errorData);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (searchId === searchRef.current) {
        setResults([]);
      }
    } finally {
      if (searchId === searchRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearch = () => {
    performSearch(1);
  };

  const handlePageChange = (page: number) => {
    // Force clear results before performing search
    setResults([]);
    setPagination(prev => ({ ...prev, currentPage: page }));
    performSearch(page);
  };

  const clearFilters = () => {
    setFilters({
      company: [],
      country: [],
      city: [],
      state: [],
      jobTitle: [],
      jobTitleLevel: [],
      department: [],
      industry: [],
      minEmployeeSize: undefined,
      maxEmployeeSize: undefined
    });
    setResults([]);
    setPagination({
      currentPage: 1,
      totalPages: 0,
      totalResults: 0,
      pageSize: 25
    });
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
      `}</style>
      {/* Header */}
      <header 
        className="text-white shadow-sm"
        style={{
          background: 'rgba(102, 126, 234, 0.15)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="container-fluid" style={{ paddingLeft: '3.5rem', paddingRight: '3.5rem' }}>
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h2 className="text-white mb-2" style={{ 
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff'
              }}>
                Prospect Advance Search
              </h2>
              <p className="mb-0" style={{ 
                fontSize: '12px',
                fontWeight: '400',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                Search by company, industry, employee size, and more
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              {/* Company Dropdown */}
              <div className="dropdown">
                <button
                  className="btn btn-outline-light dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                        style={{ 
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#fff'
                        }}
                >
                  <i className="fas fa-building me-2"></i>
                  Company
                </button>
                <ul className="dropdown-menu" style={{ 
                  background: 'rgba(102, 126, 234, 0.2)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
                               fontSize: '14px',
                               fontWeight: '400',
                               color: '#333'
                             }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-building me-2"></i>
                      Direct Search
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
                        style={{ 
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#fff'
                        }}
                >
                  <i className="fas fa-user me-2"></i>
                  Prospect
                </button>
                <ul className="dropdown-menu" style={{ 
                  background: 'rgba(102, 126, 234, 0.2)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
                               fontSize: '14px',
                               fontWeight: '400',
                               color: '#333'
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
                               fontSize: '14px',
                               fontWeight: '400',
                               color: '#333'
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
      </header>

      <div className="container-fluid py-4">
        <div className="row g-4">
          {/* Search Filters */}
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
                  <i className="fas fa-filter text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 text-white" style={{ 
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Search Filters
                  </h5>
                </div>
              </div>
              <div className="card-body p-3">
                <div className="accordion" id="filtersAccordion">
                  {/* Company Profile */}
                  <div className="accordion-item mb-3" style={{ border: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                    <h2 className="accordion-header">
                      <button 
                        className="accordion-button" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#companyProfile" 
                        aria-expanded="true" 
                        aria-controls="companyProfile"
                        style={{ 
                          backgroundColor: '#6c757d', 
                          color: 'white', 
                          borderRadius: '12px 12px 0 0', 
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-building me-2"></i>
                        Company Profile
                      </button>
                    </h2>
                    <div id="companyProfile" className="accordion-collapse collapse show">
                      <div className="accordion-body">
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-building me-2 text-muted"></i>Company
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.company}
                            onChange={(value) => setFilters({...filters, company: value})}
                            field="company"
                            placeholder="Microsoft, Google"
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
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-industry me-2 text-muted"></i>Industry
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.industry}
                            onChange={(value) => setFilters({...filters, industry: value})}
                            field="industry"
                            placeholder="Technology, Healthcare"
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
                        <div className="mb-2">
                          <label className="form-label fw-semibold" style={{ fontSize: '12px', color: '#6c757d' }}>
                            <i className="fas fa-users me-2"></i>Employee Size Range
                          </label>
                        </div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label fw-semibold" style={{ fontSize: '10px', color: '#6c757d' }}>
                              Min
                            </label>
                            <input
                              type="number"
                              min="0"
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
                              value={filters.minEmployeeSize || ''}
                              onChange={(e) => setFilters({...filters, minEmployeeSize: parseInt(e.target.value) || 0})}
                              placeholder="Min"
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-semibold" style={{ fontSize: '10px', color: '#6c757d' }}>
                              Max
                            </label>
                            <input
                              type="number"
                              min="0"
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
                              value={filters.maxEmployeeSize || ''}
                              onChange={(e) => setFilters({...filters, maxEmployeeSize: parseInt(e.target.value) || 0})}
                              placeholder="Max"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Profile */}
                  <div className="accordion-item mb-3" style={{ border: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                    <h2 className="accordion-header">
                      <button 
                        className="accordion-button collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#jobProfile" 
                        aria-expanded="false" 
                        aria-controls="jobProfile"
                        style={{ 
                          backgroundColor: '#6c757d', 
                          color: 'white', 
                          borderRadius: '12px 12px 0 0', 
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-briefcase me-2"></i>
                        Job Profile
                      </button>
                    </h2>
                    <div id="jobProfile" className="accordion-collapse collapse">
                      <div className="accordion-body">
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-briefcase me-2 text-muted"></i>Job Title
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.jobTitle}
                            onChange={(value) => setFilters({...filters, jobTitle: value})}
                            field="jobTitle"
                            placeholder="Software Engineer, Manager"
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
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-layer-group me-2 text-muted"></i>Job Title Level
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.jobTitleLevel}
                            onChange={(value) => setFilters({...filters, jobTitleLevel: value})}
                            field="jobTitleLevel"
                            placeholder="Senior, Director"
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
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-sitemap me-2 text-muted"></i>Department
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.department}
                            onChange={(value) => setFilters({...filters, department: value})}
                            field="department"
                            placeholder="Engineering, Sales"
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
                    </div>
                  </div>

                  {/* Location */}
                  <div className="accordion-item mb-3" style={{ border: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                    <h2 className="accordion-header">
                      <button 
                        className="accordion-button collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#location" 
                        aria-expanded="false" 
                        aria-controls="location"
                        style={{ 
                          backgroundColor: '#6c757d', 
                          color: 'white', 
                          borderRadius: '12px 12px 0 0', 
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-map-marker-alt me-2"></i>
                        Location
                      </button>
                    </h2>
                    <div id="location" className="accordion-collapse collapse">
                      <div className="accordion-body">
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-globe me-2 text-muted"></i>Country
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.country}
                            onChange={(value) => setFilters({...filters, country: value})}
                            field="country"
                            placeholder="United States"
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
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-map-marked-alt me-2 text-muted"></i>State
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.state}
                            onChange={(value) => setFilters({...filters, state: value})}
                            field="state"
                            placeholder="California, New York"
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
                        <div className="mb-3">
                          <label className="form-label" style={{ 
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#555'
                          }}>
                            <i className="fas fa-map-marker-alt me-2 text-muted"></i>City
                          </label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.city}
                            onChange={(value) => setFilters({...filters, city: value})}
                            field="city"
                            placeholder="San Francisco, New York"
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
                    </div>
                  </div>
                </div>

                <div className="d-grid gap-2 mt-4">
                  <button
                    onClick={handleSearch}
                    disabled={loading}
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
                    onClick={clearFilters}
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
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="col-lg-9">
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
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-list text-white me-3" style={{ fontSize: '18px' }}></i>
                    <h5 className="mb-0 text-white" style={{ 
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      Search Results
                    </h5>
                  </div>
                  {pagination.totalResults > 0 && (
                    <div className="text-end">
                      <div className="small" style={{ 
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#000'
                      }}>
                        Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1}-{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalResults)} of {pagination.totalResults.toLocaleString()} results
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-body p-4">
                {loading ? (
                  <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                    <div className="card-body text-center py-5">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted">Loading search results...</p>
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  <>
                    <div className="card shadow-sm" style={{ 
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="table-responsive" style={{ borderRadius: '16px 16px 0 0', overflowX: 'auto', overflowY: 'hidden' }}>
                        <table className="table table-hover mb-0" style={{ 
                          minWidth: '1200px', 
                          marginBottom: '0', 
                          marginTop: '0',
                          backgroundColor: '#ffffff'
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
                            <th className="text-center sortable-header" style={{ 
                              width: '180px', 
                              whiteSpace: 'nowrap', 
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#444',
                              cursor: 'pointer',
                              transition: 'color 0.3s ease'
                            }}>
                              <i className="fas fa-user me-2"></i>Name
                              <i className="fas fa-sort ms-2" style={{ fontSize: '10px', opacity: 0.6 }}></i>
                            </th>
                            <th className="text-center sortable-header" style={{ 
                              width: '150px', 
                              whiteSpace: 'nowrap', 
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#444',
                              cursor: 'pointer',
                              transition: 'color 0.3s ease'
                            }}>
                              <i className="fas fa-building me-2"></i>Company
                              <i className="fas fa-sort ms-2" style={{ fontSize: '10px', opacity: 0.6 }}></i>
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
                              width: '180px', 
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
                              width: '120px', 
                              whiteSpace: 'nowrap', 
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#444'
                            }}>
                              <i className="fas fa-dollar-sign me-2"></i>Revenue
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
                          {results.map((result, index) => {
                            const rowNumber = (pagination.currentPage - 1) * pagination.pageSize + index + 1;
                            console.log(`Row ${index + 1}: calculated rowNumber=${rowNumber}, currentPage=${pagination.currentPage}, pageSize=${pagination.pageSize}`);
                            return (
                              <tr key={`${pagination.currentPage}-${result.id}-${index}`} className="align-middle">
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <span className="text-muted fw-medium">{rowNumber}</span>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <div className="fw-semibold text-dark">
                                    {result.salutation && `${result.salutation} `}
                                    {result.firstName} {result.lastName}
                                  </div>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  {result.companyDomain ? (
                                    <button
                                      onClick={() => router.push(`/company-search?domain=${encodeURIComponent(result.companyDomain || '')}`)}
                                      className="btn btn-link p-0 text-decoration-none"
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#007bff',
                                        border: 'none',
                                        background: 'none',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'color 0.3s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#0056b3';
                                        e.currentTarget.style.textDecoration = 'underline';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#007bff';
                                        e.currentTarget.style.textDecoration = 'none';
                                      }}
                                      title={`View company details for ${result.company}`}
                                    >
                                      {result.company}
                                    </button>
                                  ) : (
                                    <span className="text-dark">{result.company}</span>
                                  )}
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <span className="text-dark">{result.jobTitle || '-'}</span>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <span className="text-dark">{result.jobTitleLevel || '-'}</span>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <span className="text-dark">{result.department || '-'}</span>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <div className="d-flex align-items-center justify-content-center">
                                    <i className="fas fa-map-marker-alt text-muted me-2"></i>
                                    <span className="text-dark">
                                      {[result.city, result.state, result.country].filter(Boolean).join(', ')}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <div className="d-flex align-items-center justify-content-center">
                                    <i className="fas fa-envelope text-muted me-2"></i>
                                    <a href={`mailto:${result.email}`} className="text-primary text-decoration-none">
                                      {result.email}
                                    </a>
                                  </div>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <div className="d-flex align-items-center justify-content-center">
                                    <i className="fas fa-phone text-muted me-2"></i>
                                    <a href={`tel:${result.phone || result.mobilePhone}`} className="text-primary text-decoration-none">
                                      {formatPhoneNumber(result.phone || result.mobilePhone)}
                                    </a>
                                  </div>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <div className="d-flex align-items-center justify-content-center">
                                    <i className="fas fa-dollar-sign text-muted me-2"></i>
                                    <span className="text-dark fw-medium">
                                      {formatRevenue(result.revenue)}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-center" style={{ fontSize: '11px' }}>
                                  <button
                                    onClick={() => router.push(`/direct-search?email=${encodeURIComponent(result.email || '')}`)}
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={!result.email}
                                    style={{ 
                                      fontSize: '10px',
                                      padding: '4px 12px',
                                      borderWidth: '1px',
                                      borderRadius: '50px'
                                    }}
                                    title={result.email ? "View detailed information" : "No email available"}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        </table>
                      </div>
                      <div style={{ borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
                        <div style={{ height: '1px', backgroundColor: '#dee2e6' }}></div>
                      </div>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <nav className="mt-4">
                        <ul className="pagination justify-content-center" style={{ fontSize: '13px' }}>
                          {/* First Page Button */}
                          {pagination.currentPage > 3 && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(1)}
                                title="First page"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                &laquo;&laquo;
                              </button>
                            </li>
                          )}
                          
                          {/* Previous Page Button */}
                          {pagination.currentPage > 1 && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                title="Previous page"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                &laquo;
                              </button>
                            </li>
                          )}
                          
                          {/* Previous Pages */}
                          {pagination.currentPage > 2 && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.currentPage - 2)}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                {pagination.currentPage - 2}
                              </button>
                            </li>
                          )}
                          
                          {pagination.currentPage > 1 && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                {pagination.currentPage - 1}
                              </button>
                            </li>
                          )}
                          
                          {/* Current Page */}
                          <li className="page-item active">
                            <span className="page-link" style={{ padding: '6px 12px', fontSize: '12px' }}>
                              {pagination.currentPage}
                            </span>
                          </li>
                          
                          {/* Next Pages */}
                          {pagination.currentPage < pagination.totalPages && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                {pagination.currentPage + 1}
                              </button>
                            </li>
                          )}
                          
                          {pagination.currentPage < pagination.totalPages - 1 && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.currentPage + 2)}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                {pagination.currentPage + 2}
                              </button>
                            </li>
                          )}
                          
                          {/* Next Page Button */}
                          {pagination.currentPage < pagination.totalPages && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                title="Next page"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                &raquo;
                              </button>
                            </li>
                          )}
                          
                          {/* Last Page Button */}
                          {pagination.currentPage < pagination.totalPages - 2 && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.totalPages)}
                                title="Last page"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                &raquo;&raquo;
                              </button>
                            </li>
                          )}
                        </ul>
                      </nav>
                    )}
                  </>
                ) : (
                  <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                    <div className="card-body text-center py-5">
                      <div className="mb-4">
                        <i className="fas fa-search text-muted" style={{ fontSize: '3rem' }}></i>
                      </div>
                      <h5 className="fw-semibold text-dark mb-2">
                        No Results Found
                      </h5>
                      <p className="text-muted mb-0">
                        Try adjusting your search filters to find more results
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading search page...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
