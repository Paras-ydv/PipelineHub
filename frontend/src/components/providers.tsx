'use client';
import { useEffect } from 'react';
import { initSocketListeners, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

export function Providers({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      initSocketListeners();
    }
    return () => {
      disconnectSocket();
    };
  }, [token]);

  return <>{children}</>;
}
