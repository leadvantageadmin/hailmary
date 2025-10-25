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
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/search');
        }
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
    <div className="min-vh-100" style={{ background: 'var(--gradient-hero)' }}>
      {/* Background Elements */}
      <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden">
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ top: '80px', left: '40px', width: '80px', height: '80px' }}></div>
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ top: '160px', right: '80px', width: '64px', height: '64px', animationDelay: '1s' }}></div>
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ bottom: '80px', left: '80px', width: '96px', height: '96px', animationDelay: '2s' }}></div>
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ bottom: '160px', right: '40px', width: '48px', height: '48px', animationDelay: '0.5s' }}></div>
      </div>

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
          <div className="card shadow-lg border-0">
            <div className="card-header bg-transparent border-0 p-4">
              <div className="text-center">
                <h2 className="h4 fw-bold text-dark mb-2" style={{ fontFamily: 'var(--font-primary)' }}>
                  Welcome Back
                </h2>
                <p className="text-muted mb-0">
                  Sign in to access your customer search portal
                </p>
              </div>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label fw-semibold">
                    <i className="fas fa-envelope text-muted me-2"></i>
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
                      padding: '12px 16px', 
                      fontSize: '1rem',
                      borderRadius: '12px',
                      border: '2px solid #e9ecef'
                    }}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label fw-semibold">
                    <i className="fas fa-lock text-muted me-2"></i>
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
                      padding: '12px 16px', 
                      fontSize: '1rem',
                      borderRadius: '12px',
                      border: '2px solid #e9ecef'
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
                    fontSize: '1.1rem',
                    borderRadius: '12px',
                    background: 'var(--gradient-primary)',
                    border: 'none'
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
