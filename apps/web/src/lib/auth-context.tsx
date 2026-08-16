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
import {
  AUTH_CHANGED_EVENT,
  clearStoredAuth,
  getStoredAuth,
  REFRESH_KEY,
  setStoredAuth,
  TOKEN_KEY,
  USER_KEY,
} from './auth-store';
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

  const syncFromStorage = useCallback(() => {
    const stored = getStoredAuth();
    setToken(stored.token);
    setUser(stored.user);
  }, []);

  useEffect(() => {
    const stored = getStoredAuth();
    setToken(stored.token);
    setUser(stored.user);
    setIsHydrated(true);

    // Keep the session in React state whenever the store changes outside this
    // component: same-tab writes (Google OAuth callback, profile saves) fire
    // AUTH_CHANGED_EVENT, and other tabs fire the browser `storage` event.
    // Both re-read localStorage so the navbar updates instantly.
    function handleAuthChanged() {
      syncFromStorage();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === TOKEN_KEY || event.key === REFRESH_KEY || event.key === USER_KEY) {
        syncFromStorage();
      }
    }

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncFromStorage]);

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
