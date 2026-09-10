'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginScreen from '@/components/LoginScreen';

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return <LoginScreen />;
}
