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
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-white opacity-10 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-white opacity-10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white opacity-10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-10 w-12 h-12 bg-white opacity-10 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <div className="flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-40 mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="w-full flex items-center justify-center animate-fade-in" style={{ height: '50px' }}>
            <h1 className="text-2xl font-bold text-center" style={{ 
              fontFamily: 'var(--font-primary)',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              width: '100%',
              textAlign: 'center',
              lineHeight: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              Project Hail Mary
            </h1>
          </div>

          {/* Login Form */}
          <div className="card animate-slide-in-up" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="card-header" style={{ padding: '20px 20px 15px' }}>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-primary)' }}>
                  Welcome Back
                </h2>
                <p className="text-sm text-gray-600">
                  Sign in to access your customer search portal
                </p>
              </div>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="email" className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      <i className="fas fa-envelope text-gray-500" style={{ fontSize: '14px', marginRight: '12px' }}></i>
                      Email Address
                    </label>
                    <div className="input-wrapper">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="input"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="password" className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      <i className="fas fa-lock text-gray-500" style={{ fontSize: '14px', marginRight: '12px' }}></i>
                      Password
                    </label>
                    <div className="input-wrapper">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="input"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '12px', height: '32px' }}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-error animate-fade-in" style={{ padding: '8px 12px', marginBottom: '12px' }}>
                    <div className="flex items-center">
                      <i className="fas fa-exclamation-triangle mr-2" style={{ fontSize: '12px' }}></i>
                      <span style={{ fontSize: '11px' }}>{error}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                  style={{ padding: '8px 12px', fontSize: '12px', height: '32px' }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner h-3 w-3" style={{ marginRight: '8px' }}></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <i className="fas fa-sign-in-alt" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                      Sign In
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="card animate-scale-in" style={{ background: 'rgba(255, 255, 255, 0.95)', border: '2px solid rgba(30, 144, 255, 0.2)', width: '100%', maxWidth: '500px', marginTop: '32px' }}>
            <div className="card-body" style={{ padding: '16px' }}>
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <i className="fas fa-info-circle text-blue-600 mr-2" style={{ fontSize: '14px', marginRight: '8px' }}></i>
                    Demo Credentials
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Admin Account:</p>
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-gray-800">
                        <i className="fas fa-envelope text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        admin@leadvantageglobal.com
                      </p>
                      <p className="font-mono text-xs text-gray-600">
                        <i className="fas fa-key text-gray-500" style={{ fontSize: '10px', marginRight: '8px' }}></i>
                        Password: admin123
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use these credentials to explore the platform features
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center animate-fade-in">
            <div className="flex items-center justify-center space-x-4 text-white text-opacity-70 text-sm" style={{ marginTop: '32px' }}>
              <span>© 2024 LeadAdvantage Global</span>
              <span>•</span>
              <span>Premium B2B Lead Generation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
