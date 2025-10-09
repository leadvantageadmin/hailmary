'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="page-container flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
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
                <i className="fas fa-cog text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-primary)' }}>
                  Admin Panel
                </h1>
                <p className="text-sm text-white text-opacity-80">
                  Welcome back, {currentUser?.firstName} {currentUser?.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/search')}
                className="btn btn-secondary"
              >
                <i className="fas fa-search mr-2"></i>
                Search Portal
              </button>
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
        {/* User Management */}
        <div className="card animate-fade-in">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <i className="fas fa-users text-red-600 mr-2"></i>
                <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                  User Management
                </h2>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-success"
              >
                <i className="fas fa-plus mr-2"></i>
                Create User
              </button>
            </div>
          </div>

          {/* Create/Edit Form */}
          {(showCreateForm || editingUser) && (
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="card-body">
                <div className="flex items-center mb-6">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-edit text-white"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                </div>
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="grid-form">
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-envelope mr-2 text-gray-500"></i>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      className="input"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-lock mr-2 text-gray-500"></i>
                      Password {editingUser && <span className="text-gray-500">(leave blank to keep current)</span>}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      className="input"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-user mr-2 text-gray-500"></i>
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                      placeholder="John"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-user mr-2 text-gray-500"></i>
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                      placeholder="Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-shield-alt mr-2 text-gray-500"></i>
                      Role
                    </label>
                    <select
                      className="input"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="form-group flex items-end space-x-3">
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      <i className="fas fa-check mr-2"></i>
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingUser(null);
                        setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'USER' });
                      }}
                      className="btn btn-secondary"
                    >
                      <i className="fas fa-times mr-2"></i>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Role</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {users.map((user, index) => (
                  <tr key={user.id} className="table-row" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3 shadow-lg">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.id === currentUser?.id && 'Current User'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        user.role === 'ADMIN' 
                          ? 'badge-danger' 
                          : 'badge-success'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => startEdit(user)}
                          className="btn btn-ghost text-blue-600 hover:text-blue-900 p-1"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn btn-ghost text-red-600 hover:text-red-900 p-1"
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
  );
}
