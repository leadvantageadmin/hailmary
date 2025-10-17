'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeBootstrap() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push('/login-bootstrap');
  }, [router]);

  return (
    <div className="min-vh-100" style={{ background: 'var(--gradient-hero)' }}>
      {/* Background Elements */}
      <div className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden">
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ top: '80px', left: '40px', width: '80px', height: '80px' }}></div>
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ top: '160px', right: '80px', width: '64px', height: '64px', animationDelay: '1s' }}></div>
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ bottom: '80px', left: '80px', width: '96px', height: '96px', animationDelay: '2s' }}></div>
        <div className="position-absolute bg-white bg-opacity-10 rounded-circle animate-pulse" style={{ bottom: '160px', right: '40px', width: '48px', height: '48px', animationDelay: '0.5s' }}></div>
      </div>

      <div className="position-relative min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="mx-auto bg-white bg-opacity-20 rounded-3 d-flex align-items-center justify-content-center shadow-lg mb-4" style={{ width: '96px', height: '96px' }}>
            <i className="fas fa-search text-white" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h1 className="display-4 fw-bold text-white mb-3" style={{ fontFamily: 'var(--font-primary)' }}>
            HailMary
          </h1>
          <p className="h4 text-white text-opacity-90 mb-2">
            Customer Search Platform
          </p>
          <p className="h5 text-white text-opacity-70 mb-4">
            Advanced customer search and management platform
          </p>
          <div className="d-flex align-items-center justify-content-center text-white text-opacity-80">
            <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            <span className="h5">Redirecting to login...</span>
          </div>
          <div className="mt-4 text-white text-opacity-60 small">
            <p>Powered by LeadAdvantage Global</p>
          </div>
        </div>
      </div>
    </div>
  );
}
