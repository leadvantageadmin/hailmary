'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface ProfileDropdownProps {
  user: User;
  onLogout: () => void;
}

export default function ProfileDropdown({ user, onLogout }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleProfileClick = () => {
    router.push('/profile');
    setIsOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setIsOpen(false);
  };

  const handleAdminClick = () => {
    router.push('/admin');
    setIsOpen(false);
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-light dropdown-toggle d-flex align-items-center"
        type="button"
        id="profileDropdown"
        data-bs-toggle="dropdown"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        style={{ fontSize: '1.1em' }}
      >
        <i className="fas fa-user-circle me-2"></i>
        <span>{user.firstName} {user.lastName}</span>
      </button>
      
      <ul 
        className={`dropdown-menu dropdown-menu-end ${isOpen ? 'show' : ''}`}
        aria-labelledby="profileDropdown"
        style={{
          minWidth: '240px',
          border: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          borderRadius: '12px',
          padding: '12px 0',
          marginTop: '8px'
        }}
      >
        {/* User Info Header */}
        <li className="px-4 py-3 border-bottom" style={{ borderColor: '#f1f3f4' }}>
          <div className="d-flex align-items-center">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                 style={{ width: '44px', height: '44px', fontSize: '16px', fontWeight: '600' }}>
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <div className="flex-grow-1">
              <div className="fw-semibold text-dark mb-1" style={{ fontSize: '0.95em', lineHeight: '1.3' }}>
                {user.firstName} {user.lastName}
              </div>
              <div className="small text-muted mb-2" style={{ fontSize: '0.8em', lineHeight: '1.2' }}>
                {user.email}
              </div>
              <div>
                <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger' : 'bg-secondary'}`} 
                      style={{ fontSize: '0.7em', padding: '4px 8px' }}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </li>
        
        {/* Profile Link */}
        <li>
          <button 
            className="dropdown-item d-flex align-items-center px-4 py-3"
            onClick={handleProfileClick}
            style={{ 
              fontSize: '0.9em',
              border: 'none',
              background: 'transparent',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <i className="fas fa-user-edit me-3 text-muted" style={{ width: '16px', textAlign: 'center' }}></i>
            <span>Profile Settings</span>
          </button>
        </li>
        
        {/* Admin Panel (only for admins) */}
        {user.role === 'ADMIN' && (
          <li>
            <button 
              className="dropdown-item d-flex align-items-center px-4 py-3"
              onClick={handleAdminClick}
              style={{ 
                fontSize: '0.9em',
                border: 'none',
                background: 'transparent',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-cog me-3 text-muted" style={{ width: '16px', textAlign: 'center' }}></i>
              <span>Admin Panel</span>
            </button>
          </li>
        )}
        
        {/* Divider */}
        <li><hr className="dropdown-divider my-2" style={{ margin: '8px 0', borderColor: '#f1f3f4' }} /></li>
        
        {/* Logout */}
        <li>
          <button 
            className="dropdown-item d-flex align-items-center px-4 py-3 text-danger"
            onClick={handleLogoutClick}
            style={{ 
              fontSize: '0.9em',
              border: 'none',
              background: 'transparent',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <i className="fas fa-sign-out-alt me-3" style={{ width: '16px', textAlign: 'center' }}></i>
            <span>Logout</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
