'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-white opacity-10 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-white opacity-10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white opacity-10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-10 w-12 h-12 bg-white opacity-10 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mx-auto h-24 w-24 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-3xl flex items-center justify-center shadow-2xl mb-8">
            <i className="fas fa-search text-4xl text-white"></i>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-primary)' }}>
            HailMary
          </h1>
          <p className="text-2xl text-white text-opacity-90 mb-2">
            Direct Search Platform
          </p>
          <p className="text-lg text-white text-opacity-70 mb-8">
            Advanced customer search and management platform
          </p>
          <div className="flex items-center justify-center space-x-3 text-white text-opacity-80">
            <div className="spinner h-5 w-5"></div>
            <span className="text-lg">Redirecting to login...</span>
          </div>
          <div className="mt-8 text-white text-opacity-60 text-sm">
            <p>Powered by LeadAdvantage Global</p>
          </div>
        </div>
      </div>
    </div>
  );
}