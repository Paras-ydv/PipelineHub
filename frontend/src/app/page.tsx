'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (token) router.replace('/dashboard');
    else router.replace('/login');
  }, [token, router]);

  return null;
}
