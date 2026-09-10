'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  // Loading state while checking auth
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1520 50%, #0a1628 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #10b981, #0d9488)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        boxShadow: '0 0 40px rgba(16, 185, 129, 0.3)',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        🏥
      </div>
      <h1 style={{
        color: 'white',
        fontSize: '24px',
        fontWeight: 900,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '-0.5px',
      }}>
        Arogya Raksha
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading...</p>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

