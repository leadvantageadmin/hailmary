'use client';

import { useRouter } from 'next/navigation';
import ProfileDropdown from './ProfileDropdown';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface HeaderProps {
  title: string;
  subtitle: string;
  user: User | null;
  onLogout: () => void;
  showCompanyDropdown?: boolean;
  showProspectDropdown?: boolean;
  companyDropdownItems?: Array<{
    label: string;
    icon: string;
    onClick: () => void;
  }>;
  prospectDropdownItems?: Array<{
    label: string;
    icon: string;
    onClick: () => void;
  }>;
}

export default function Header({
  title,
  subtitle,
  user,
  onLogout,
  showCompanyDropdown = true,
  showProspectDropdown = true,
  companyDropdownItems = [],
  prospectDropdownItems = []
}: HeaderProps) {
  const router = useRouter();

  // Default dropdown items if none provided
  const defaultCompanyDropdownItems = [
    {
      label: 'Direct Search',
      icon: 'fas fa-building',
      onClick: () => router.push('/company-search')
    }
  ];

  const defaultProspectDropdownItems = [
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
  ];

  const finalCompanyItems = companyDropdownItems.length > 0 ? companyDropdownItems : defaultCompanyDropdownItems;
  const finalProspectItems = prospectDropdownItems.length > 0 ? prospectDropdownItems : defaultProspectDropdownItems;

  return (
    <>
      {/* CSS for header styling */}
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

      <header
        className="w-100"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                {title}
              </h2>
              <p className="mb-0" style={{ 
                fontSize: '12px',
                fontWeight: '400',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                {subtitle}
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              {/* Company Dropdown */}
              {showCompanyDropdown && (
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
                    {finalCompanyItems.map((item, index) => (
                      <li key={index}>
                        <button 
                          className="dropdown-item text-white"
                          onClick={item.onClick}
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
                          <i className={`${item.icon} me-2`}></i>
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prospect Dropdown */}
              {showProspectDropdown && (
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
                    {finalProspectItems.map((item, index) => (
                      <li key={index}>
                        <button 
                          className="dropdown-item text-white"
                          onClick={item.onClick}
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
                          <i className={`${item.icon} me-2`}></i>
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {user && <ProfileDropdown user={user} onLogout={onLogout} />}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
