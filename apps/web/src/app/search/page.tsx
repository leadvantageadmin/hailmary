'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TypeAheadInputBootstrapMultiSelect from '@/components/TypeAheadInputBootstrapMultiSelect';

interface Customer {
  id: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  mobilePhone?: string;
  jobTitle?: string;
  jobTitleLevel?: string;
  department?: string;
  industry?: string;
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
}

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
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
  
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 0,
    totalResults: 0
  });
  
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

  const performSearch = async (page: number = 1) => {
    setLoading(true);
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
        console.log('Search response:', data);
        setResults(data.items || []);
        setPagination({
          currentPage: data.pagination?.currentPage || 1,
          totalPages: data.pagination?.totalPages || 0,
          totalResults: data.pagination?.totalItems || 0
        });
      } else {
        const errorData = await response.json();
        console.error('Search failed:', errorData);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(1);
  };

  const handlePageChange = (page: number) => {
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
      totalResults: 0
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
                Advance Data Search
              </h2>
              <p className="text-white-50 mb-0" style={{ fontSize: '0.99em' }}>
                Welcome back, {user.firstName} {user.lastName}
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                onClick={() => router.push('/customer-search')}
                className="btn btn-outline-light"
                style={{ fontSize: '1.1em' }}
              >
                <i className="fas fa-user me-2"></i>
                Direct Lookup
              </button>
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin')}
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
          {/* Search Filters */}
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
                  <i className="fas fa-filter text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                    Search Filters
                  </h5>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="accordion" id="filtersAccordion">
                  {/* Company Profile */}
                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button 
                        className="accordion-button" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#companyProfile" 
                        aria-expanded="true" 
                        aria-controls="companyProfile"
                        style={{ backgroundColor: '#6c757d', color: 'white' }}
                      >
                        <i className="fas fa-building me-2"></i>
                        Company Profile
                      </button>
                    </h2>
                    <div id="companyProfile" className="accordion-collapse collapse show" data-bs-parent="#filtersAccordion">
                      <div className="accordion-body">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Company</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.company}
                            onChange={(value) => setFilters({...filters, company: value})}
                            field="company"
                            placeholder="Microsoft, Google"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Industry</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.industry}
                            onChange={(value) => setFilters({...filters, industry: value})}
                            field="industry"
                            placeholder="Technology, Healthcare"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label fw-semibold">Min Employee Size</label>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-lg"
                              style={{ 
                                fontSize: '14px',
                                minHeight: '48px',
                                padding: '8px 12px',
                                border: '1px solid #dee2e6',
                                borderRadius: '24px',
                                backgroundColor: '#ffffff'
                              }}
                              value={filters.minEmployeeSize || ''}
                              onChange={(e) => setFilters({...filters, minEmployeeSize: parseInt(e.target.value) || 0})}
                              placeholder="50"
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-semibold">Max Employee Size</label>
                            <input
                              type="number"
                              min="0"
                              className="form-control form-control-lg"
                              style={{ 
                                fontSize: '14px',
                                minHeight: '48px',
                                padding: '8px 12px',
                                border: '1px solid #dee2e6',
                                borderRadius: '24px',
                                backgroundColor: '#ffffff'
                              }}
                              value={filters.maxEmployeeSize || ''}
                              onChange={(e) => setFilters({...filters, maxEmployeeSize: parseInt(e.target.value) || 0})}
                              placeholder="500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Profile */}
                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button 
                        className="accordion-button collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#jobProfile" 
                        aria-expanded="false" 
                        aria-controls="jobProfile"
                        style={{ backgroundColor: '#6c757d', color: 'white' }}
                      >
                        <i className="fas fa-briefcase me-2"></i>
                        Job Profile
                      </button>
                    </h2>
                    <div id="jobProfile" className="accordion-collapse collapse" data-bs-parent="#filtersAccordion">
                      <div className="accordion-body">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Job Title</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.jobTitle}
                            onChange={(value) => setFilters({...filters, jobTitle: value})}
                            field="jobTitle"
                            placeholder="Software Engineer, Manager"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Job Title Level</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.jobTitleLevel}
                            onChange={(value) => setFilters({...filters, jobTitleLevel: value})}
                            field="jobTitleLevel"
                            placeholder="Senior, Director"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Department</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.department}
                            onChange={(value) => setFilters({...filters, department: value})}
                            field="department"
                            placeholder="Engineering, Sales"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button 
                        className="accordion-button collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#location" 
                        aria-expanded="false" 
                        aria-controls="location"
                        style={{ backgroundColor: '#6c757d', color: 'white' }}
                      >
                        <i className="fas fa-map-marker-alt me-2"></i>
                        Location
                      </button>
                    </h2>
                    <div id="location" className="accordion-collapse collapse" data-bs-parent="#filtersAccordion">
                      <div className="accordion-body">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Country</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.country}
                            onChange={(value) => setFilters({...filters, country: value})}
                            field="country"
                            placeholder="United States"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">State</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.state}
                            onChange={(value) => setFilters({...filters, state: value})}
                            field="state"
                            placeholder="California, New York"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">City</label>
                          <TypeAheadInputBootstrapMultiSelect
                            value={filters.city}
                            onChange={(value) => setFilters({...filters, city: value})}
                            field="city"
                            placeholder="San Francisco, New York"
                            className="form-control form-control-lg"
                            style={{ 
                              fontSize: '14px',
                              minHeight: '48px',
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '24px',
                              backgroundColor: '#ffffff'
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
                    onClick={clearFilters}
                    className="btn btn-outline-secondary"
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '1rem',
                      borderRadius: '12px'
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
            <div className="card shadow-sm">
              <div 
                className="card-header border-0 p-4"
                style={{
                  background: 'var(--gradient-primary)',
                  borderRadius: '16px 16px 0 0'
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-list text-white me-3" style={{ fontSize: '18px' }}></i>
                    <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                      Search Results
                    </h5>
                  </div>
                  {pagination.totalResults > 0 && (
                    <div className="text-end">
                      <div className="badge bg-white text-primary mb-1">
                        {pagination.totalResults.toLocaleString()} total results
                      </div>
                      <div className="small text-white-50">
                        Showing {((pagination.currentPage - 1) * 25) + 1}-{Math.min(pagination.currentPage * 25, pagination.totalResults)} of {pagination.totalResults.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-body p-4">
                {results.length > 0 ? (
                  <>
                    <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                      <div className="table-responsive" style={{ borderRadius: '16px 16px 0 0', overflowX: 'auto', overflowY: 'hidden' }}>
                        <table className="table table-black table-hover table-striped mb-0" style={{ minWidth: '1200px', marginBottom: '0', marginTop: '0' }}>
                        <thead style={{ marginTop: '0' }}>
                          <tr>
                            <th className="fw-bold text-center" style={{ width: '60px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-hashtag me-2"></i>
                            </th>
                            <th className="fw-bold text-center" style={{ width: '180px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-user me-2"></i>Name
                            </th>
                            <th className="fw-bold text-center" style={{ width: '150px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-building me-2"></i>Company
                            </th>
                            <th className="fw-bold text-center" style={{ width: '160px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-briefcase me-2"></i>Job Title
                            </th>
                            <th className="fw-bold text-center" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-layer-group me-2"></i>Job Level
                            </th>
                            <th className="fw-bold text-center" style={{ width: '140px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-sitemap me-2"></i>Department
                            </th>
                            <th className="fw-bold text-center" style={{ width: '180px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-map-marker-alt me-2"></i>Location
                            </th>
                            <th className="fw-bold text-center" style={{ width: '200px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-envelope me-2"></i>Email
                            </th>
                            <th className="fw-bold text-center" style={{ width: '150px', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-phone me-2"></i>Phone
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((customer, index) => {
                            const rowNumber = (pagination.currentPage - 1) * 25 + index + 1;
                            return (
                              <tr key={customer.id} className="align-middle">
                                <td className="text-center" >
                                  <span className="text-muted fw-medium">{rowNumber}</span>
                                </td>
                                <td className="text-center" >
                                  <div className="fw-semibold text-dark">
                                    {customer.salutation && `${customer.salutation} `}
                                    {customer.firstName} {customer.lastName}
                                  </div>
                                </td>
                                <td className="text-center" >
                                  <span className="text-dark">{customer.company}</span>
                                </td>
                                <td className="text-center" >
                                  <span className="text-dark">{customer.jobTitle}</span>
                                </td>
                                <td className="text-center" >
                                  <span className="text-dark">{customer.jobTitleLevel}</span>
                                </td>
                                <td className="text-center" >
                                  <span className="text-dark">{customer.department}</span>
                                </td>
                                <td className="text-center" >
                                  <div className="d-flex align-items-center justify-content-center">
                                    <i className="fas fa-map-marker-alt text-muted me-2"></i>
                                    <span className="text-dark">
                                      {[customer.city, customer.state, customer.country].filter(Boolean).join(', ')}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-center" >
                                  <div className="d-flex align-items-center justify-content-center">
                                    <i className="fas fa-envelope text-muted me-2"></i>
                                    <a href={`mailto:${customer.email}`} className="text-primary text-decoration-none">
                                      {customer.email}
                                    </a>
                                  </div>
                                </td>
                                <td className="text-center" >
                                  <div className="d-flex align-items-center justify-content-center">
                                    <i className="fas fa-phone text-muted me-2"></i>
                                    <a href={`tel:${customer.phone || customer.mobilePhone}`} className="text-primary text-decoration-none">
                                      {customer.phone || customer.mobilePhone}
                                    </a>
                                  </div>
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
                        <ul className="pagination justify-content-center pagination-lg">
                          {/* First Page Button */}
                          {pagination.currentPage > 3 && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(1)}
                                title="First page"
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
                              >
                                {pagination.currentPage - 1}
                              </button>
                            </li>
                          )}
                          
                          {/* Current Page */}
                          <li className="page-item active">
                            <span className="page-link">
                              {pagination.currentPage}
                            </span>
                          </li>
                          
                          {/* Next Pages */}
                          {pagination.currentPage < pagination.totalPages && (
                            <li className="page-item">
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
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
