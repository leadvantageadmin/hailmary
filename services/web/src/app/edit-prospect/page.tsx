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

interface ProspectData {
  id: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  jobTitleLevel: string;
  department: string;
  jobTitleLink: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  mobilePhone: string;
  companyId: string;
}

function EditProspectPageContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [prospectData, setProspectData] = useState<ProspectData>({
    id: '',
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    jobTitleLevel: '',
    department: '',
    jobTitleLink: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    phone: '',
    mobilePhone: '',
    companyId: ''
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const prospectId = searchParams.get('id');

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
    if (prospectId) {
      // Fetch prospect data
      fetch(`/api/prospect/${prospectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.prospect) {
            setProspectData(data.prospect);
          } else {
            setMessage({ type: 'error', text: 'Prospect not found' });
          }
          setLoading(false);
        })
        .catch(() => {
          setMessage({ type: 'error', text: 'Failed to load prospect data' });
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [prospectId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProspectData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/prospect/${prospectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prospectData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Prospect updated successfully!' });
        setTimeout(() => {
          router.push(`/direct-search?email=${encodeURIComponent(prospectData.email)}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to update prospect' });
      }
    } catch (error) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating the prospect' });
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
            <p>Loading prospect data...</p>
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
        title="Edit Prospect"
        subtitle="Update prospect information"
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
                  <i className="fas fa-user text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 text-white" style={{ 
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Prospect Information
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
                    {/* Salutation */}
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-user-tag text-muted me-2"></i>
                        Salutation
                      </label>
                      <select
                        name="salutation"
                        className="form-control form-control-lg"
                        value={prospectData.salutation}
                        onChange={handleInputChange}
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      >
                        <option value="">Select</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                      </select>
                    </div>

                    {/* First Name */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-user text-muted me-2"></i>
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        className="form-control form-control-lg"
                        value={prospectData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Last Name */}
                    <div className="col-md-5">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-user text-muted me-2"></i>
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        className="form-control form-control-lg"
                        value={prospectData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Email - Read Only */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-envelope text-muted me-2"></i>
                        Email Address
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
                        {prospectData.email || '-'}
                      </div>
                      <div className="mt-2">
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          <i className="fas fa-info-circle me-1"></i>
                          Email cannot be changed as it's the unique identifier
                        </small>
                      </div>
                    </div>

                    {/* Job Title */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-briefcase text-muted me-2"></i>
                        Job Title
                      </label>
                      <input
                        type="text"
                        name="jobTitle"
                        className="form-control form-control-lg"
                        value={prospectData.jobTitle}
                        onChange={handleInputChange}
                        placeholder="Enter job title"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Job Title Level */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-layer-group text-muted me-2"></i>
                        Job Title Level
                      </label>
                      <input
                        type="text"
                        name="jobTitleLevel"
                        className="form-control form-control-lg"
                        value={prospectData.jobTitleLevel}
                        onChange={handleInputChange}
                        placeholder="Enter job title level"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Department */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-sitemap text-muted me-2"></i>
                        Department
                      </label>
                      <input
                        type="text"
                        name="department"
                        className="form-control form-control-lg"
                        value={prospectData.department}
                        onChange={handleInputChange}
                        placeholder="Enter department"
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>

                    {/* Job Title Link */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-link text-muted me-2"></i>
                        Job Title Link
                      </label>
                      <input
                        type="text"
                        name="jobTitleLink"
                        className="form-control form-control-lg"
                        value={prospectData.jobTitleLink}
                        onChange={handleInputChange}
                        placeholder="Enter job title link"
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
                        value={prospectData.address}
                        onChange={handleInputChange}
                        placeholder="Enter address"
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
                        value={prospectData.city}
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
                        value={prospectData.state}
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
                        value={prospectData.country}
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
                        value={prospectData.zipCode}
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
                        value={prospectData.phone}
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
                        value={prospectData.mobilePhone}
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
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 justify-content-center mt-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/direct-search?email=${encodeURIComponent(prospectData.email || '')}`)}
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
                          Update Prospect
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

export default function EditProspectPage() {
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
      <EditProspectPageContent />
    </Suspense>
  );
}
