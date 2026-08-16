import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { AuthUser } from '../../lib/types';

export function Protected({ role, children }: { role: AuthUser['role']; children: ReactNode }) {
  const { isAuthenticated, user, isHydrated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for the auth session to hydrate before deciding where to send the
    // user; otherwise a logged-in user would be bounced to /auth/login during
    // the client's first (pre-hydration) render.
    if (!isHydrated) return;
    if (!isAuthenticated) void navigate({ to: '/auth/login' });
    else if (user?.role !== role) void navigate({ to: '/' });
  }, [isHydrated, isAuthenticated, user?.role, role, navigate]);

  if (!isHydrated || !isAuthenticated || user?.role !== role) return null;
  return <>{children}</>;
}
