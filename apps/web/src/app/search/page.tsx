'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TypeAheadInput from '@/components/TypeAheadInput';

interface SearchFilters {
  company: string;
  country: string;
  city: string;
  state: string;
  jobTitle: string;
  department: string;
  minEmployeeSize: number;
  maxEmployeeSize: number;
  industry: string;
}

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
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    company: '',
    country: '',
    city: '',
    state: '',
    jobTitle: '',
    department: '',
    minEmployeeSize: 0,
    maxEmployeeSize: 0,
    industry: ''
  });
  
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
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

  const performSearch = async (pageNumber: number = 1) => {
    setLoading(true);
    try {
      const filterObj: any = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 0) {
          if (key === 'employeeSize') {
            filterObj[key] = [value];
          } else {
            filterObj[key] = [value];
          }
        }
      });

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: filterObj,
          page: { size: 25, number: pageNumber }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.items || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        console.error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async () => {
    // Reset to page 1 for new search
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    await performSearch(1);
  };

  const clearFilters = () => {
    setFilters({
      company: '',
      country: '',
      city: '',
      state: '',
      jobTitle: '',
      department: '',
      minEmployeeSize: 0,
      maxEmployeeSize: 0,
      industry: ''
    });
    setResults([]);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = async (newPage: number) => {
    // Validate page number to prevent negative or invalid pages
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      await performSearch(newPage);
    }
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
                <i className="fas fa-search text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                  HailMary Customer Search
                </h1>
                <p className="text-sm text-white text-opacity-80">
                  Welcome back, {user.firstName} {user.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
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

      <div className="page-content" style={{ maxWidth: 'none', padding: '40px 20px' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          gap: '24px', 
          height: '100%' 
        }}>
          {/* Left Component - Search Filters (30%) */}
          <div style={{ width: '30%', minHeight: 'calc(100vh - 200px)' }}>
            <div className="card h-full animate-fade-in">
              <div className="card-header">
                <div className="flex items-center">
                  <i className="fas fa-filter text-blue-600" style={{ marginRight: '8px' }}></i>
                    Search Filters
                </div>
              </div>
              <div className="card-body flex flex-col h-full">
                <div className="flex-1">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-building text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Company
                      </label>
                      <TypeAheadInput
                        value={filters.company}
                        onChange={(value) => setFilters({...filters, company: value})}
                        field="company"
                        placeholder="Microsoft, Google"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-globe text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Country
                      </label>
                      <TypeAheadInput
                        value={filters.country}
                        onChange={(value) => setFilters({...filters, country: value})}
                        field="country"
                        placeholder="United States"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-map-marker-alt text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        City
                      </label>
                      <TypeAheadInput
                        value={filters.city}
                        onChange={(value) => setFilters({...filters, city: value})}
                        field="city"
                        placeholder="New York"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-map text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        State
                      </label>
                      <TypeAheadInput
                        value={filters.state}
                        onChange={(value) => setFilters({...filters, state: value})}
                        field="state"
                        placeholder="California"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-briefcase text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Job Title
                      </label>
                      <TypeAheadInput
                        value={filters.jobTitle}
                        onChange={(value) => setFilters({...filters, jobTitle: value})}
                        field="jobTitle"
                        placeholder="Director"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-sitemap text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Department
                      </label>
                      <TypeAheadInput
                        value={filters.department}
                        onChange={(value) => setFilters({...filters, department: value})}
                        field="department"
                        placeholder="Engineering"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-users text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Min Employee Size
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                        value={filters.minEmployeeSize || ''}
                        onChange={(e) => setFilters({...filters, minEmployeeSize: parseInt(e.target.value) || 0})}
                        placeholder="50"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-users text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Max Employee Size
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                        value={filters.maxEmployeeSize || ''}
                        onChange={(e) => setFilters({...filters, maxEmployeeSize: parseInt(e.target.value) || 0})}
                        placeholder="1000"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
                        <i className="fas fa-industry text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Industry
                      </label>
                      <TypeAheadInput
                        value={filters.industry}
                        onChange={(value) => setFilters({...filters, industry: value})}
                        field="industry"
                        placeholder="Technology"
                        style={{ padding: '6px 8px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={onSearch}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', height: '32px' }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="spinner h-3 w-3 mr-1"></div>
                        Searching...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <i className="fas fa-search" style={{ fontSize: '10px', marginRight: '6px' }}></i>
                        Search
                      </div>
                    )}
                  </button>
                  <button
                    onClick={clearFilters}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px', height: '32px', color: '#000000' }}
                  >
                    <i className="fas fa-times" style={{ fontSize: '10px', marginRight: '6px' }}></i>
                    Clear
                  </button>
                </div>
                
                <div className="alert alert-info" style={{ marginTop: '12px', padding: '8px 12px' }}>
                  <div className="flex items-start">
                    <i className="fas fa-info-circle text-blue-400 mt-0.5 flex-shrink-0" style={{ fontSize: '16px', marginRight: '8px' }}></i>
                    Search Tips
                    <div>
                      <p className="text-blue-800 mt-1" style={{ fontSize: '10px', lineHeight: '1.3' }}>
                        All fields support partial matching. Min Employee Size filters companies with at least that many employees. Max Employee Size filters companies with at most that many employees.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Component - Search Results (70%) */}
          <div style={{ width: '70%' }}>
            {results.length > 0 ? (
              <div className="animate-slide-in-up">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <i className="fas fa-check-circle text-green-600" style={{ marginRight: '8px' }}></i>
                      Search Results
                  </div>
                  <span className="badge badge-primary" style={{ marginTop: '4px' }}>
                    {pagination.totalItems} {pagination.totalItems === 1 ? 'result' : 'results'} found
                  </span>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <div className="card">
                  <div 
                    className="overflow-x-auto" 
                    style={{ 
                      maxWidth: '100%', 
                      overflowX: 'auto', 
                      overflowY: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e0 #f7fafc'
                    }}
                  >
                    <table className="min-w-full" style={{ borderCollapse: 'collapse', minWidth: '1200px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px', width: '30px', minWidth: '30px' }}>
                            #
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Name
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Job Title
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Company
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Email
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Phone
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Location
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Department
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ borderRight: '1px solid #e2e8f0', fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Employee Size
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'var(--font-primary)', fontSize: '13px' }}>
                            Industry
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((customer, index) => (
                          <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-150" style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', textAlign: 'center', fontSize: '10px', width: '30px', minWidth: '30px' }}>
                              {Math.max(1, (pagination.currentPage - 1) * pagination.pageSize + index + 1)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div className="flex items-center justify-center">
                                <div className="font-medium text-gray-900" style={{ fontFamily: 'var(--font-primary)', fontSize: '10px' }}>
                                  {customer.salutation} {customer.firstName} {customer.lastName}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              {customer.jobTitle || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              {customer.company || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              {customer.email || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              {customer.phone || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              <div>
                                {customer.city && customer.state ? (
                                  <div>
                                    <div>{customer.city}, {customer.state}</div>
                                    {customer.country && <div className="text-gray-500" style={{ fontSize: '11px' }}>{customer.country}</div>}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              {customer.department || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ borderRight: '1px solid #e2e8f0', verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              {(() => {
                                const minSize = customer.minEmployeeSize;
                                const maxSize = customer.maxEmployeeSize;
                                
                                if (!minSize && !maxSize) return '-';
                                if (minSize && maxSize) return `${minSize}-${maxSize}`;
                                if (minSize && !maxSize) return `${minSize}+`;
                                return '-';
                              })()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900" style={{ verticalAlign: 'middle', fontSize: '11px', textAlign: 'center' }}>
                              {customer.industry || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6 w-full">
                    {/* Results Info */}
                    <div className="text-center mb-4">
                      <span className="text-sm text-gray-600">
                        Showing {Math.max(1, ((pagination.currentPage - 1) * pagination.pageSize) + 1)} to{' '}
                        {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
                        {pagination.totalItems} results
                      </span>
                    </div>
                    
                    {/* Pagination Buttons - Centered */}
                    <div className="flex items-center justify-center space-x-3 w-full">
                      {/* Previous Button */}
                      <button
                        onClick={async () => await handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage <= 1}
                        className="btn btn-secondary flex items-center"
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '12px',
                          height: '32px',
                          opacity: pagination.currentPage <= 1 ? 0.5 : 1,
                          cursor: pagination.currentPage <= 1 ? 'not-allowed' : 'pointer',
                          color: pagination.currentPage <= 1 ? '#6b7280' : '#000000'
                        }}
                      >
                        <i className="fas fa-chevron-left" style={{ marginRight: '6px', fontSize: '10px' }}></i>
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={async () => await handlePageChange(pageNum)}
                              className={`px-3 py-2 text-sm rounded-full transition-colors duration-150 ${
                                pageNum === pagination.currentPage
                                  ? 'btn btn-primary'
                                  : 'btn btn-secondary'
                              }`}
                              style={{ 
                                minWidth: '32px',
                                height: '32px',
                                fontSize: '12px',
                                fontFamily: 'var(--font-primary)',
                                color: pageNum === pagination.currentPage ? '#ffffff' : '#000000'
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={async () => await handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage >= pagination.totalPages}
                        className="btn btn-secondary flex items-center"
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '12px',
                          height: '32px',
                          opacity: pagination.currentPage >= pagination.totalPages ? 0.5 : 1,
                          cursor: pagination.currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer',
                          color: pagination.currentPage >= pagination.totalPages ? '#6b7280' : '#000000'
                        }}
                      >
                        Next
                        <i className="fas fa-chevron-right" style={{ marginLeft: '6px', fontSize: '10px' }}></i>
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-search text-3xl text-gray-400" style={{ marginRight: '8px' }}></i>
                    No search results yet
                  </div>
                    
                  <p className="text-gray-500">
                    Use the filters on the left to search for customers
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
