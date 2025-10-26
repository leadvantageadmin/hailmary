'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect based on user role
        // Always redirect to advanced search page after login
        router.push('/search');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        h1 {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
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
      `}</style>

      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="w-100" style={{ maxWidth: '500px' }}>
          {/* Header */}
          <div className="text-center mb-5">
            <h1 className="text-white fw-bold mb-0" style={{ 
              fontFamily: 'var(--font-primary)',
              fontSize: '2rem',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Project Hail Mary
            </h1>
          </div>

          {/* Login Form */}
          <div className="card shadow-lg" style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="card-header border-0 p-4" style={{
              background: 'rgba(102, 126, 234, 0.2)',
              backdropFilter: 'blur(15px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px 16px 0 0'
            }}>
              <div className="text-center">
                <h2 className="h4 mb-2 text-white" style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Welcome Back
                </h2>
                <p className="mb-0" style={{
                  fontSize: '14px',
                  fontWeight: '400',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  Sign in to access data search and management portal
                </p>
              </div>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label" style={{
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#fff'
                  }}>
                    <i className="fas fa-envelope me-2" style={{ fontSize: '16px', color: '#fff' }}></i>
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="form-control form-control-lg"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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

                <div className="mb-4">
                  <label htmlFor="password" className="form-label" style={{
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#fff'
                  }}>
                    <i className="fas fa-lock me-2" style={{ fontSize: '16px', color: '#fff' }}></i>
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="form-control form-control-lg"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

                {error && (
                  <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg w-100"
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
                  {loading ? (
                    <div className="d-flex align-items-center justify-content-center">
                      <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-sign-in-alt me-2"></i>
                      Sign In
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>


          {/* Footer */}
          <div className="text-center mt-5">
            <div className="d-flex align-items-center justify-content-center text-white text-opacity-70 small">
              <span>© 2024 LeadAdvantage Global</span>
              <span className="mx-2">•</span>
              <span>Premium B2B Lead Generation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
