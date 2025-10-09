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

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 animate-fade-in">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-2xl mb-6">
              <i className="fas fa-search text-3xl text-white"></i>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-primary)' }}>
              HailMary
            </h1>
            <p className="text-xl text-white text-opacity-90 mb-2">
              Customer Search Platform
            </p>
            <p className="text-sm text-white text-opacity-70">
              Powered by LeadAdvantage Global
            </p>
          </div>

          {/* Login Form */}
          <div className="card animate-slide-in-up">
            <div className="card-header">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-primary)' }}>
                  Welcome Back
                </h2>
                <p className="text-gray-600">
                  Sign in to access your customer search portal
                </p>
              </div>
            </div>
            <div className="card-body">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      <i className="fas fa-envelope mr-2 text-gray-500"></i>
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
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      <i className="fas fa-lock mr-2 text-gray-500"></i>
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
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-error animate-fade-in">
                    <div className="flex items-center">
                      <i className="fas fa-exclamation-triangle mr-3"></i>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full btn-large"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner h-5 w-5 mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Sign In
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="card animate-scale-in" style={{ background: 'rgba(255, 255, 255, 0.95)', border: '2px solid rgba(30, 144, 255, 0.2)' }}>
            <div className="card-body">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                    Demo Credentials
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Admin Account:</p>
                    <div className="space-y-1">
                      <p className="font-mono text-sm text-gray-800">
                        <i className="fas fa-envelope mr-2 text-gray-500"></i>
                        admin@leadvantageglobal.com
                      </p>
                      <p className="font-mono text-sm text-gray-600">
                        <i className="fas fa-key mr-2 text-gray-500"></i>
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
            <div className="flex items-center justify-center space-x-4 text-white text-opacity-70 text-sm">
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
