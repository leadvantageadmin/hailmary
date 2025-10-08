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
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HailMary Customer Search</h1>
              <p className="text-gray-600">Welcome, {user.firstName} {user.lastName}</p>
            </div>
            <div className="flex items-center space-x-4">
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Search Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.company}
                onChange={(e) => setFilters({...filters, company: e.target.value})}
                placeholder="e.g., Microsoft, Google"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value})}
                placeholder="e.g., United States, India"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
                placeholder="e.g., New York, Mumbai"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.state}
                onChange={(e) => setFilters({...filters, state: e.target.value})}
                placeholder="e.g., California, Maharashtra"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.jobTitle}
                onChange={(e) => setFilters({...filters, jobTitle: e.target.value})}
                placeholder="e.g., Director, Manager"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.department}
                onChange={(e) => setFilters({...filters, department: e.target.value})}
                placeholder="e.g., Engineering, Sales"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Size (Minimum)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.employeeSize || ''}
                onChange={(e) => setFilters({...filters, employeeSize: parseInt(e.target.value) || 0})}
                placeholder="e.g., 50, 1000, 10000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.industry}
                onChange={(e) => setFilters({...filters, industry: e.target.value})}
                placeholder="e.g., Technology, Healthcare"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={onSearch}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Search Tips:</strong> All text fields support partial matching. 
              For Employee Size, enter the minimum number of employees (e.g., entering 10 will show companies with 10+ employees).
            </p>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Search Results ({results.length} found)</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {results.map((customer) => (
                <div key={customer.id} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {customer.salutation} {customer.firstName} {customer.lastName}
                      </h4>
                      <p className="text-gray-600">{customer.email}</p>
                      <p className="text-gray-600">{customer.phone}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">{customer.company}</h5>
                      <p className="text-gray-600">{customer.jobTitle}</p>
                      <p className="text-gray-600">{customer.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{customer.address}</p>
                      <p className="text-gray-600">{customer.city}, {customer.state} {customer.zipCode}</p>
                      <p className="text-gray-600">{customer.country}</p>
                      {customer.employeeSize && (
                        <p className="text-gray-600">Company Size: {customer.employeeSize}+ employees</p>
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
