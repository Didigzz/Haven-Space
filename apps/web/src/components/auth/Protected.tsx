import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { AuthUser } from '../../lib/types';

export function Protected({ role, children }: { role: AuthUser['role']; children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) void navigate({ to: '/auth/login' });
    else if (user?.role !== role) void navigate({ to: '/' });
  }, [isAuthenticated, user?.role, role, navigate]);

  if (!isAuthenticated || user?.role !== role) return null;
  return <>{children}</>;
}
