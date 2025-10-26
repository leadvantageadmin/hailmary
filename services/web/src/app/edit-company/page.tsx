'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface CompanyData {
  id: string;
  domain: string;
  name: string;
  industry: string;
  minEmployeeSize: number;
  maxEmployeeSize: number;
  employeeSizeLink: string;
  revenue: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  mobilePhone: string;
}

function EditCompanyPageContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData>({
    id: '',
    domain: '',
    name: '',
    industry: '',
    minEmployeeSize: 0,
    maxEmployeeSize: 0,
    employeeSizeLink: '',
    revenue: 0,
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    phone: '',
    mobilePhone: ''
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('id');

  useEffect(() => {
    // Check authentication and role
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          if (data.user.role !== 'ADMIN' && data.user.role !== 'MODERATOR') {
            router.push('/search');
            return;
          }
          setUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (companyId) {
      // Fetch company data
      fetch(`/api/company/${companyId}`)
        .then(res => res.json())
        .then(data => {
          if (data.company) {
            setCompanyData(data.company);
          } else {
            setMessage({ type: 'error', text: 'Company not found' });
          }
          setLoading(false);
        })
        .catch(() => {
          setMessage({ type: 'error', text: 'Failed to load company data' });
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [companyId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : 0) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/company/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Company updated successfully!' });
        setTimeout(() => {
          router.push(`/company-search?domain=${encodeURIComponent(companyData.domain)}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to update company' });
      }
    } catch (error) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating the company' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => router.push('/login'))
      .catch(() => router.push('/login'));
  };

  if (loading) {
    return (
      <div className="min-vh-100" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center text-white">
            <div className="spinner-border mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading company data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Inter, sans-serif'
    }}>
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
        
        /* Header dropdown button hover and open states */
        .dropdown-toggle:hover,
        .dropdown-toggle.show {
          color: #000 !important;
        }

        .dropdown-toggle:hover *,
        .dropdown-toggle.show * {
          color: #000 !important;
        }
      `}</style>

      <Header
        title="Edit Company"
        subtitle="Update company information"
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
          <div className="col-lg-8 col-xl-6">
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
                  <i className="fas fa-building text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 text-white" style={{ 
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Company Information
                  </h5>
                </div>
              </div>

              <div className="card-body p-4">
                {message && (
                  <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-4`} role="alert">
                    <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    {/* Company Name */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-building text-muted me-2"></i>
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="form-control form-control-lg"
                        value={companyData.name}
                        onChange={handleInputChange}
                        placeholder="Enter company name"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Domain - Read Only */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-globe text-muted me-2"></i>
                        Domain
                      </label>
                      <div 
                        className="d-inline-block"
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '14px',
                          fontWeight: '500',
                          borderRadius: '50px',
                          border: '2px solid #e9ecef',
                          backgroundColor: '#f8f9fa',
                          color: '#6c757d',
                          cursor: 'not-allowed',
                          marginBottom: '8px'
                        }}
                      >
                        <i className="fas fa-lock me-2" style={{ fontSize: '12px' }}></i>
                        {companyData.domain}
                      </div>
                      <div className="mt-2">
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          <i className="fas fa-info-circle me-1"></i>
                          Domain cannot be changed as it's the unique identifier
                        </small>
                      </div>
                    </div>

                    {/* Industry */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-industry text-muted me-2"></i>
                        Industry
                      </label>
                      <input
                        type="text"
                        name="industry"
                        className="form-control form-control-lg"
                        value={companyData.industry}
                        onChange={handleInputChange}
                        placeholder="Enter industry"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Revenue */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-dollar-sign text-muted me-2"></i>
                        Revenue
                      </label>
                      <input
                        type="number"
                        name="revenue"
                        className="form-control form-control-lg"
                        value={companyData.revenue}
                        onChange={handleInputChange}
                        placeholder="Enter revenue"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Employee Size */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-users text-muted me-2"></i>
                        Min Employee Size
                      </label>
                      <input
                        type="number"
                        name="minEmployeeSize"
                        className="form-control form-control-lg"
                        value={companyData.minEmployeeSize}
                        onChange={handleInputChange}
                        placeholder="Enter min employee size"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-users text-muted me-2"></i>
                        Max Employee Size
                      </label>
                      <input
                        type="number"
                        name="maxEmployeeSize"
                        className="form-control form-control-lg"
                        value={companyData.maxEmployeeSize}
                        onChange={handleInputChange}
                        placeholder="Enter max employee size"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Address */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-map-marker-alt text-muted me-2"></i>
                        Address
                      </label>
                      <textarea
                        name="address"
                        className="form-control form-control-lg"
                        value={companyData.address}
                        onChange={handleInputChange}
                        placeholder="Enter company address"
                        rows={3}
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* City, State, Country */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-city text-muted me-2"></i>
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        className="form-control form-control-lg"
                        value={companyData.city}
                        onChange={handleInputChange}
                        placeholder="Enter city"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-map text-muted me-2"></i>
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        className="form-control form-control-lg"
                        value={companyData.state}
                        onChange={handleInputChange}
                        placeholder="Enter state"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-flag text-muted me-2"></i>
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        className="form-control form-control-lg"
                        value={companyData.country}
                        onChange={handleInputChange}
                        placeholder="Enter country"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Zip Code */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-mail-bulk text-muted me-2"></i>
                        Zip Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        className="form-control form-control-lg"
                        value={companyData.zipCode}
                        onChange={handleInputChange}
                        placeholder="Enter zip code"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Phone */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-phone text-muted me-2"></i>
                        Phone
                      </label>
                      <input
                        type="text"
                        name="phone"
                        className="form-control form-control-lg"
                        value={companyData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter phone number"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Mobile Phone */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-mobile-alt text-muted me-2"></i>
                        Mobile Phone
                      </label>
                      <input
                        type="text"
                        name="mobilePhone"
                        className="form-control form-control-lg"
                        value={companyData.mobilePhone}
                        onChange={handleInputChange}
                        placeholder="Enter mobile phone"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Employee Size Link */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-link text-muted me-2"></i>
                        Employee Size Link
                      </label>
                      <input
                        type="text"
                        name="employeeSizeLink"
                        className="form-control form-control-lg"
                        value={companyData.employeeSizeLink}
                        onChange={handleInputChange}
                        placeholder="Enter employee size link"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 justify-content-center mt-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/company-search?domain=${encodeURIComponent(companyData.domain)}`)}
                      className="btn btn-outline-secondary"
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
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary"
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
                      {saving ? (
                        <div className="d-flex align-items-center">
                          <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                          Updating...
                        </div>
                      ) : (
                        <div className="d-flex align-items-center">
                          <i className="fas fa-save me-2"></i>
                          Update Company
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditCompanyPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center text-white">
            <div className="spinner-border mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <EditCompanyPageContent />
    </Suspense>
  );
}
