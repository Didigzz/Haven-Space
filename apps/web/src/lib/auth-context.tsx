import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  completeGoogleAuth,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type GoogleCompleteInput,
} from './api/auth';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './auth-store';
import type { AuthUser, RegisterInput } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  completeGoogle: (input: GoogleCompleteInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // The session lives in localStorage, which only exists in the browser. Read it
  // after mount instead of during render so the server-rendered HTML (always
  // logged out) matches the client's first render, avoiding SSR hydration
  // mismatches on protected pages.
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();
    setToken(stored.token);
    setUser(stored.user);
    setIsHydrated(true);
  }, []);

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

  const completeGoogle = useCallback(async (input: GoogleCompleteInput) => {
    const response = await completeGoogleAuth(input);
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
      isHydrated,
      login,
      register,
      completeGoogle,
      logout,
      refreshUser,
    }),
    [user, token, isHydrated, login, register, completeGoogle, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
