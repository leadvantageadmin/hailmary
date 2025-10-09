'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchFilters {
  company: string;
  country: string;
  city: string;
  state: string;
  jobTitle: string;
  department: string;
  employeeSize: number;
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
  employeeSize?: number;
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

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    company: '',
    country: '',
    city: '',
    state: '',
    jobTitle: '',
    department: '',
    employeeSize: 0,
    industry: ''
  });
  
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
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

  const onSearch = async () => {
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
          page: { size: 20 }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.items || []);
      } else {
        console.error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      company: '',
      country: '',
      city: '',
      state: '',
      jobTitle: '',
      department: '',
      employeeSize: 0,
      industry: ''
    });
    setResults([]);
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

      <div className="page-content">
        {/* Search Form */}
        <div className="card mb-8 animate-fade-in">
          <div className="card-header">
            <div className="flex items-center">
              <i className="fas fa-filter text-blue-600 mr-2"></i>
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                Search Filters
              </h2>
            </div>
          </div>
          <div className="card-body">
            <div className="grid-responsive mb-6">
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-building mr-2 text-gray-500"></i>
                  Company
                </label>
                <input
                  type="text"
                  className="input"
                  value={filters.company}
                  onChange={(e) => setFilters({...filters, company: e.target.value})}
                  placeholder="e.g., Microsoft, Google"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-globe mr-2 text-gray-500"></i>
                  Country
                </label>
                <input
                  type="text"
                  className="input"
                  value={filters.country}
                  onChange={(e) => setFilters({...filters, country: e.target.value})}
                  placeholder="e.g., United States, India"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-map-marker-alt mr-2 text-gray-500"></i>
                  City
                </label>
                <input
                  type="text"
                  className="input"
                  value={filters.city}
                  onChange={(e) => setFilters({...filters, city: e.target.value})}
                  placeholder="e.g., New York, Mumbai"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-map mr-2 text-gray-500"></i>
                  State
                </label>
                <input
                  type="text"
                  className="input"
                  value={filters.state}
                  onChange={(e) => setFilters({...filters, state: e.target.value})}
                  placeholder="e.g., California, Maharashtra"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-briefcase mr-2 text-gray-500"></i>
                  Job Title
                </label>
                <input
                  type="text"
                  className="input"
                  value={filters.jobTitle}
                  onChange={(e) => setFilters({...filters, jobTitle: e.target.value})}
                  placeholder="e.g., Director, Manager"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-sitemap mr-2 text-gray-500"></i>
                  Department
                </label>
                <input
                  type="text"
                  className="input"
                  value={filters.department}
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                  placeholder="e.g., Engineering, Sales"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-users mr-2 text-gray-500"></i>
                  Employee Size (Minimum)
                </label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={filters.employeeSize || ''}
                  onChange={(e) => setFilters({...filters, employeeSize: parseInt(e.target.value) || 0})}
                  placeholder="e.g., 50, 1000, 10000"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-industry mr-2 text-gray-500"></i>
                  Industry
                </label>
                <input
                  type="text"
                  className="input"
                  value={filters.industry}
                  onChange={(e) => setFilters({...filters, industry: e.target.value})}
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onSearch}
                disabled={loading}
                className="btn btn-primary flex-1 sm:flex-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner h-4 w-4 mr-2"></div>
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <i className="fas fa-search mr-2"></i>
                    Search
                  </div>
                )}
              </button>
              <button
                onClick={clearFilters}
                className="btn btn-secondary flex-1 sm:flex-none"
              >
                <i className="fas fa-times mr-2"></i>
                Clear Filters
              </button>
            </div>
            
            <div className="alert alert-info mt-6">
              <div className="flex items-start">
                <i className="fas fa-info-circle text-blue-400 mr-3 mt-0.5 flex-shrink-0"></i>
                <div>
                  <p className="font-medium text-blue-900">Search Tips</p>
                  <p className="text-sm text-blue-800 mt-1">
                    All text fields support partial matching. For Employee Size, enter the minimum number of employees 
                    (e.g., entering 10 will show companies with 10+ employees).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="card animate-slide-in-up">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <i className="fas fa-check-circle text-green-600 mr-2"></i>
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                    Search Results
                  </h3>
                </div>
                <span className="badge badge-primary">
                  {results.length} {results.length === 1 ? 'result' : 'results'} found
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {results.map((customer, index) => (
                <div key={customer.id} className="p-6 hover:bg-gray-50 transition-colors duration-150" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                          {customer.firstName?.[0]}{customer.lastName?.[0]}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                            {customer.salutation} {customer.firstName} {customer.lastName}
                          </h4>
                          <p className="text-sm text-gray-500">{customer.jobTitle}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <i className="fas fa-envelope mr-2 text-gray-400"></i>
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <i className="fas fa-phone mr-2 text-gray-400"></i>
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <i className="fas fa-building mr-2 text-gray-400"></i>
                          {customer.company}
                        </h5>
                        {customer.department && (
                          <p className="text-sm text-gray-600 ml-6">{customer.department}</p>
                        )}
                      </div>
                      {customer.employeeSize && (
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-users mr-2 text-gray-400"></i>
                          {customer.employeeSize}+ employees
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start text-sm text-gray-600">
                        <i className="fas fa-map-marker-alt mr-2 text-gray-400 mt-0.5 flex-shrink-0"></i>
                        <div>
                          {customer.address && <p>{customer.address}</p>}
                          <p>{customer.city}, {customer.state} {customer.zipCode}</p>
                          <p>{customer.country}</p>
                        </div>
                      </div>
                      {customer.industry && (
                        <div className="flex items-center text-sm">
                          <span className="badge badge-gray">{customer.industry}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
