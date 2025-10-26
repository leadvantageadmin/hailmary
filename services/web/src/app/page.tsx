'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          // User is logged in, redirect to advanced search
          router.push('/search');
        } else {
          // User is not logged in, redirect to login
          router.push('/login');
        }
      } catch (error) {
        // Error checking auth, redirect to login
        router.push('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen" style={{ 
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
      `}</style>

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
            <span className="text-lg">{isChecking ? 'Checking authentication...' : 'Redirecting...'}</span>
          </div>
          <div className="mt-8 text-white text-opacity-60 text-sm">
            <p>Powered by LeadAdvantage Global</p>
          </div>
        </div>
      </div>
    </div>
  );
}