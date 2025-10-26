'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileDropdown from '@/components/ProfileDropdown';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const router = useRouter();

  useEffect(() => {
    // Check authentication and get user data
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setProfileData(prev => ({
            ...prev,
            firstName: data.user.firstName,
            lastName: data.user.lastName
          }));
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Validate password confirmation
      if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
        setMessage({ type: 'error', text: 'New passwords do not match' });
        return;
      }

      // Prepare update data
      const updateData: any = {
        firstName: profileData.firstName,
        lastName: profileData.lastName
      };

      // Only include password fields if new password is provided
      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setUser(result.user);
        // Clear password fields
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating your profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-light)' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
      
      {/* CSS for typography and glass morphism effects */}
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
        
        /* Main title */
        h2 {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
        
        /* Welcome message */
        .text-white-50 {
          font-size: 12px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
        }
        
        /* Navigation links */
        .btn-outline-light {
          font-size: 14px;
          font-weight: 500;
          color: #fff;
        }
        
        /* Dropdown menu items */
        .dropdown-item {
          font-size: 14px;
          font-weight: 400;
          color: #333;
        }
        
        .dropdown-item:hover {
          font-weight: 500 !important;
          color: #000 !important;
        }
        
        /* Section titles */
        h5 {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        /* Form labels */
        .form-label {
          font-size: 13px;
          font-weight: 400;
          color: #555;
        }
        
        /* Input field text */
        .form-control {
          font-size: 14px;
          font-weight: 400;
          color: #333;
        }
        
        /* Button text */
        .btn {
          font-size: 15px;
          font-weight: 600;
          color: #fff;
        }
        
        /* Card styling with glass morphism */
        .card {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 16px !important;
        }
        
        .card-header {
          background: rgba(102, 126, 234, 0.2) !important;
          backdrop-filter: blur(15px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        /* Dropdown styling */
        .dropdown-menu {
          background: rgba(102, 126, 234, 0.2) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
        }
        
        /* Header styling */
        header {
          background: rgba(102, 126, 234, 0.25) !important;
          backdrop-filter: blur(20px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        /* Input focus states */
        .form-control:focus {
          border-color: #20c997 !important;
          box-shadow: 0 0 0 0.2rem rgba(32, 201, 151, 0.25) !important;
        }
        
        /* Button hover effects */
        .btn:hover {
          transform: translateY(-1px);
          transition: all 0.3s ease;
        }
        
        /* Card hover effects */
        .card:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transform: translateY(-1px);
          transition: all 0.3s ease;
        }
        
        /* Ensure glass morphism effects are visible */
        .card {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        .card-header {
          background: rgba(102, 126, 234, 0.2) !important;
          backdrop-filter: blur(15px) !important;
        }
        
        /* Button hover effects */
        .btn:hover {
          transform: translateY(-1px);
          transition: all 0.3s ease;
        }
        
        .dropdown-toggle:hover,
        .dropdown-toggle.show {
          color: #000 !important;
        }
        
        .dropdown-toggle:hover *,
        .dropdown-toggle.show * {
          color: #000 !important;
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
                User Profile
              </h2>
              <p className="mb-0" style={{
                fontSize: '12px',
                fontWeight: '400',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                Manage your account information
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
                  <i className="fas fa-user-circle text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 text-white" style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Profile Information
                  </h5>
                </div>
              </div>
              <div className="card-body p-4">
                {message && (
                  <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
                    <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Basic Information */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="fw-semibold text-dark mb-3">
                        <i className="fas fa-info-circle me-2 text-primary"></i>
                        Basic Information
                      </h6>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label" style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        <i className="fas fa-user me-2" style={{ fontSize: '16px', color: '#fff' }}></i>First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        className="form-control form-control-lg"
                        value={profileData.firstName}
                        onChange={handleInputChange}
                        required
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
                    <div className="col-md-6 mb-3">
                      <label className="form-label" style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        <i className="fas fa-user me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        className="form-control form-control-lg"
                        value={profileData.lastName}
                        onChange={handleInputChange}
                        required
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
                    <div className="col-12 mb-3">
                      <label className="form-label" style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        <i className="fas fa-envelope me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Email Address
                      </label>
                      <div className="d-flex align-items-center">
                        <span className="badge rounded-pill" style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#333',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e0e0e0',
                          padding: '12px 20px',
                          minHeight: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '50px'
                        }}>
                          <i className="fas fa-envelope me-2" style={{ color: '#6c757d' }}></i>
                          {user.email}
                        </span>
                      </div>
                      <div className="form-text" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Email address cannot be changed</div>
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label" style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        <i className="fas fa-shield-alt me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Role
                      </label>
                      <div className="d-flex align-items-center">
                        <span className={`badge rounded-pill ${user.role === 'ADMIN' ? 'bg-danger' : 'bg-success'}`} style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#fff',
                          padding: '12px 20px',
                          minHeight: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '50px'
                        }}>
                          <i className="fas fa-shield-alt me-2"></i>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Password Section */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="fw-semibold text-dark mb-3">
                        <i className="fas fa-lock me-2 text-primary"></i>
                        Change Password
                      </h6>
                      <p className="text-muted small mb-3">Leave password fields empty if you don't want to change your password</p>
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label" style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        <i className="fas fa-key me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        className="form-control form-control-lg"
                        value={profileData.currentPassword}
                        onChange={handleInputChange}
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
                    <div className="col-md-6 mb-3">
                      <label className="form-label" style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        <i className="fas fa-lock me-2" style={{ fontSize: '16px', color: '#fff' }}></i>New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        className="form-control form-control-lg"
                        value={profileData.newPassword}
                        onChange={handleInputChange}
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
                    <div className="col-md-6 mb-3">
                      <label className="form-label" style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        <i className="fas fa-lock me-2" style={{ fontSize: '16px', color: '#fff' }}></i>Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        className="form-control form-control-lg"
                        value={profileData.confirmPassword}
                        onChange={handleInputChange}
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

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      onClick={() => router.push('/search')}
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
                          Saving...
                        </div>
                      ) : (
                        <div className="d-flex align-items-center">
                          <i className="fas fa-save me-2"></i>
                          Save Changes
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
