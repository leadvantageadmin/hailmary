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
              <h2 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-primary)', fontSize: '1.65rem' }}>
                User Profile
              </h2>
              <p className="text-white-50 mb-0" style={{ fontSize: '0.99em' }}>
                Manage your account information
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <button
                onClick={() => router.push('/search')}
                className="btn btn-outline-light"
                style={{ fontSize: '1.1em' }}
              >
                <i className="fas fa-search me-2"></i>
                Search
              </button>
              <button
                onClick={() => router.push('/direct-search')}
                className="btn btn-outline-light"
                style={{ fontSize: '1.1em' }}
              >
                <i className="fas fa-user me-2"></i>
                Direct Lookup
              </button>
              {user && <ProfileDropdown user={user} onLogout={handleLogout} />}
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-6">
            <div className="card shadow-sm">
              <div 
                className="card-header border-0 p-4"
                style={{
                  background: 'var(--gradient-primary)',
                  borderRadius: '16px 16px 0 0'
                }}
              >
                <div className="d-flex align-items-center">
                  <i className="fas fa-user-circle text-white me-3" style={{ fontSize: '18px' }}></i>
                  <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
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
                      <label className="form-label fw-semibold">
                        <i className="fas fa-user me-2 text-muted"></i>First Name
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
                          minHeight: '48px',
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '12px'
                        }}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-user me-2 text-muted"></i>Last Name
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
                          minHeight: '48px',
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '12px'
                        }}
                      />
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-envelope me-2 text-muted"></i>Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control form-control-lg"
                        value={user.email}
                        disabled
                        style={{ 
                          fontSize: '14px',
                          minHeight: '48px',
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '12px',
                          backgroundColor: '#f8f9fa'
                        }}
                      />
                      <div className="form-text">Email address cannot be changed</div>
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-shield-alt me-2 text-muted"></i>Role
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={user.role}
                        disabled
                        style={{ 
                          fontSize: '14px',
                          minHeight: '48px',
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '12px',
                          backgroundColor: '#f8f9fa'
                        }}
                      />
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
                      <label className="form-label fw-semibold">
                        <i className="fas fa-key me-2 text-muted"></i>Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        className="form-control form-control-lg"
                        value={profileData.currentPassword}
                        onChange={handleInputChange}
                        style={{ 
                          fontSize: '14px',
                          minHeight: '48px',
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '12px'
                        }}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-lock me-2 text-muted"></i>New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        className="form-control form-control-lg"
                        value={profileData.newPassword}
                        onChange={handleInputChange}
                        style={{ 
                          fontSize: '14px',
                          minHeight: '48px',
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '12px'
                        }}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-lock me-2 text-muted"></i>Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        className="form-control form-control-lg"
                        value={profileData.confirmPassword}
                        onChange={handleInputChange}
                        style={{ 
                          fontSize: '14px',
                          minHeight: '48px',
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '12px'
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
                        fontSize: '1rem',
                        borderRadius: '12px'
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
                        fontSize: '1rem',
                        borderRadius: '12px',
                        background: 'var(--gradient-primary)',
                        border: 'none'
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
