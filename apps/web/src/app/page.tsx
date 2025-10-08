"use client";

import { useState } from 'react';

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

export default function Home() {
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
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    if (key === 'employeeSize') {
      const numValue = parseInt(value) || 0;
      setFilters(prev => ({ ...prev, [key]: numValue }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const searchFilters: any = {};
      
      if (filters.company) searchFilters.company = [filters.company];
      if (filters.country) searchFilters.country = [filters.country];
      if (filters.city) searchFilters.city = [filters.city];
      if (filters.state) searchFilters.state = [filters.state];
      if (filters.jobTitle) searchFilters.jobTitle = [filters.jobTitle];
      if (filters.department) searchFilters.department = [filters.department];
      if (filters.employeeSize > 0) searchFilters.employeeSize = [filters.employeeSize];
      if (filters.industry) searchFilters.industry = [filters.industry];

      const body = { filters: searchFilters, page: { size: 20 } };
      const res = await fetch('/api/search', { 
        method: 'POST', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Search failed');
      setResults(json.items || []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

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
    setError(null);
  };

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1>Customer Search Platform</h1>
      
      <form onSubmit={onSearch} style={{ 
        background: '#f5f5f5', 
        padding: 20, 
        borderRadius: 8, 
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
      }}>
        <div style={{ gridColumn: '1 / -1', marginBottom: 8, fontSize: 14, color: '#666', fontStyle: 'italic' }}>
          💡 Tip: All search fields support partial matching. Employee Size finds companies with ≥ entered value.
        </div>
        {/* New Primary Filters */}
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Company</label>
          <input 
            value={filters.company} 
            onChange={(e) => updateFilter('company', e.target.value)} 
            placeholder="e.g., Micro, Tech, Corp"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Country</label>
          <input 
            value={filters.country} 
            onChange={(e) => updateFilter('country', e.target.value)} 
            placeholder="e.g., Italy, USA, United"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>City</label>
          <input 
            value={filters.city} 
            onChange={(e) => updateFilter('city', e.target.value)} 
            placeholder="e.g., Agrate, San, New"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>State</label>
          <input 
            value={filters.state} 
            onChange={(e) => updateFilter('state', e.target.value)} 
            placeholder="e.g., California, NON, New"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Job Title</label>
          <input 
            value={filters.jobTitle} 
            onChange={(e) => updateFilter('jobTitle', e.target.value)} 
            placeholder="e.g., Director, Manager, Engineer"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Department</label>
          <input 
            value={filters.department} 
            onChange={(e) => updateFilter('department', e.target.value)} 
            placeholder="e.g., Technology, IT, Engineering"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Employee Size (Minimum)</label>
          <input 
            type="number"
            value={filters.employeeSize || ''} 
            onChange={(e) => updateFilter('employeeSize', e.target.value)} 
            placeholder="e.g., 50, 1000, 10000"
            min="0"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Industry</label>
          <input 
            value={filters.industry} 
            onChange={(e) => updateFilter('industry', e.target.value)} 
            placeholder="e.g., Semiconductor, Software, Tech"
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              background: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button 
            type="button"
            onClick={clearFilters}
            style={{ 
              padding: '12px 24px', 
              background: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: 12, 
          borderRadius: 4, 
          marginBottom: 16,
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2>Results ({results.length})</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {results.map((r) => (
              <div key={r.id} style={{ 
                background: 'white', 
                padding: 16, 
                borderRadius: 8, 
                border: '1px solid #ddd',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                  {r.salutation && `${r.salutation} `}{r.firstName} {r.lastName}
                </h3>
                <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>
                  {r.jobTitle} at {r.company}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: 14 }}>
                  {r.email && <div><strong>Email:</strong> {r.email}</div>}
                  {r.company && <div><strong>Company:</strong> {r.company}</div>}
                  {r.department && <div><strong>Department:</strong> {r.department}</div>}
                  {r.jobTitle && <div><strong>Job Title:</strong> {r.jobTitle}</div>}
                  {r.jobTitleLevel && <div><strong>Level:</strong> {r.jobTitleLevel}</div>}
                  {r.employeeSize && <div><strong>Company Size:</strong> {r.employeeSize}</div>}
                  {r.industry && <div><strong>Industry:</strong> {r.industry}</div>}
                  {r.country && <div><strong>Country:</strong> {r.country}</div>}
                  {r.city && <div><strong>City:</strong> {r.city}</div>}
                  {r.state && <div><strong>State:</strong> {r.state}</div>}
                  {r.phone && <div><strong>Phone:</strong> {r.phone}</div>}
                  {r.mobilePhone && <div><strong>Mobile:</strong> {r.mobilePhone}</div>}
                  {r.jobTitleLink && (
                    <div>
                      <strong>LinkedIn:</strong> 
                      <a href={r.jobTitleLink} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4, color: '#007bff' }}>
                        Profile
                      </a>
                    </div>
                  )}
                  {r.employeeSizeLink && (
                    <div>
                      <strong>Company:</strong> 
                      <a href={r.employeeSizeLink} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4, color: '#007bff' }}>
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, padding: 16, background: '#e9ecef', borderRadius: 8, fontSize: 14 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>API Endpoints</h3>
        <p><code>GET /api/health</code> - Health check</p>
        <p><code>POST /api/search</code> - Search customers with filters</p>
        <p><code>GET /api/search?company=Stmicroelectronics</code> - Search by company</p>
        <p><code>GET /api/search?country=Italy</code> - Search by country</p>
        <p><code>GET /api/search?city=Agrate Brianza</code> - Search by city</p>
        <p><code>GET /api/search?industry=Semiconductor Manufacturing</code> - Search by industry</p>
        <p><code>GET /api/search?jobTitle=Director</code> - Search by job title</p>
        <p><code>GET /api/search?department=Information Technology</code> - Search by department</p>
        <p><code>GET /api/search?employeeSize=10001+</code> - Search by employee size</p>
      </div>
    </main>
  );
}
