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

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const router = useRouter();

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'USER'
  });

  useEffect(() => {
    // Check authentication and admin role
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          if (data.user.role === 'ADMIN') {
            setCurrentUser(data.user);
            loadUsers();
          } else {
            router.push('/search');
          }
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'USER' });
        setShowCreateForm(false);
        loadUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setEditingUser(null);
        setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'USER' });
        loadUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setNewUser({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });
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
          <p className="text-muted">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <header 
        className="bg-primary text-white shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="container-fluid" style={{ paddingLeft: '3.5rem', paddingRight: '3.5rem' }}>
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h2 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-primary)', fontSize: '1.65rem' }}>
                Admin Panel
              </h2>
              <p className="text-white-50 mb-0" style={{ fontSize: '0.99em' }}>
                Welcome back, {currentUser?.firstName} {currentUser?.lastName}
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
                  style={{ fontSize: '1.1em' }}
                >
                  <i className="fas fa-building me-2"></i>
                  Company
                </button>
                <ul className="dropdown-menu" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
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
                        fontSize: '0.95em'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-building me-2"></i>
                      Company Search
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
                  style={{ fontSize: '1.1em' }}
                >
                  <i className="fas fa-user me-2"></i>
                  Prospect
                </button>
                <ul className="dropdown-menu" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
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
                        fontSize: '0.95em'
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
                        fontSize: '0.95em'
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

              {currentUser && <ProfileDropdown user={currentUser} onLogout={handleLogout} />}
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4">
        {/* User Management */}
        <div className="card shadow-lg border-0">
          <div 
            className="card-header border-0 p-4"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px 16px 0 0'
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <i className="fas fa-users text-white me-3" style={{ fontSize: '18px' }}></i>
                <h5 className="mb-0 fw-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                  User Management
                </h5>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-success"
                style={{ fontSize: '1.1em' }}
              >
                <i className="fas fa-plus me-2"></i>
                Create User
              </button>
            </div>
          </div>

          {/* Create/Edit Form */}
          {(showCreateForm || editingUser) && (
            <div className="border-bottom bg-light">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-primary bg-opacity-10 rounded-3 p-2 me-3">
                    <i className="fas fa-edit text-primary"></i>
                  </div>
                  <h5 className="mb-0 fw-bold text-dark" style={{ fontFamily: 'var(--font-primary)' }}>
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h5>
                </div>
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-envelope text-muted me-2"></i>
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        className="form-control form-control-lg"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="user@example.com"
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
                        <i className="fas fa-lock text-muted me-2"></i>
                        Password {editingUser && <span className="text-muted">(leave blank to keep current)</span>}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        className="form-control form-control-lg"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Enter password"
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
                        <i className="fas fa-user text-muted me-2"></i>
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        className="form-control form-control-lg"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                        placeholder="John"
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
                        <i className="fas fa-user text-muted me-2"></i>
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        className="form-control form-control-lg"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                        placeholder="Doe"
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
                        <i className="fas fa-shield-alt text-muted me-2"></i>
                        Role
                      </label>
                      <select
                        className="form-select form-select-lg"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e9ecef'
                        }}
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="d-flex gap-2">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ 
                            padding: '12px 24px', 
                            fontSize: '1rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none'
                          }}
                        >
                          <i className="fas fa-check me-2"></i>
                          {editingUser ? 'Update User' : 'Create User'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateForm(false);
                            setEditingUser(null);
                            setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'USER' });
                          }}
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
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0">
                <thead className="table-dark">
                  <tr>
                    <th className="fw-bold text-center" style={{ padding: '12px 16px' }}>
                      <i className="fas fa-user me-2"></i>User
                    </th>
                    <th className="fw-bold text-center" style={{ padding: '12px 16px' }}>
                      <i className="fas fa-envelope me-2"></i>Email
                    </th>
                    <th className="fw-bold text-center" style={{ padding: '12px 16px' }}>
                      <i className="fas fa-shield-alt me-2"></i>Role
                    </th>
                    <th className="fw-bold text-center" style={{ padding: '12px 16px' }}>
                      <i className="fas fa-cogs me-2"></i>Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.id} className="align-middle">
                      <td className="text-center" style={{ padding: '12px 16px' }}>
                        <div className="d-flex align-items-center justify-content-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                            <span className="text-primary fw-bold">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="fw-semibold text-dark">
                              {user.firstName} {user.lastName}
                            </div>
                            {user.id === currentUser?.id && (
                              <small className="text-muted">Current User</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center" style={{ padding: '12px 16px' }}>
                        <span className="text-dark">{user.email}</span>
                      </td>
                      <td className="text-center" style={{ padding: '12px 16px' }}>
                        <span className={`badge ${
                          user.role === 'ADMIN' 
                            ? 'bg-danger' 
                            : 'bg-success'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="text-center" style={{ padding: '12px 16px' }}>
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="btn btn-outline-primary btn-sm"
                            title="Edit User"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="btn btn-outline-danger btn-sm"
                              title="Delete User"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
