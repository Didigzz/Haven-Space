import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from './api/auth';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './auth-store';
import type { AuthUser, RegisterInput } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(getStoredAuth);
  const [token, setToken] = useState<string | null>(stored.token);
  const [user, setUser] = useState<AuthUser | null>(stored.user);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    setStoredAuth(response.access_token, undefined, response.user);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await apiRegister(input);
    setStoredAuth(response.access_token, response.refresh_token, response.user);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // best-effort; local state clears regardless
    }
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const response = await getMe(token);
    setStoredAuth(token, undefined, response.user);
    setUser(response.user);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
