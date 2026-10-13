import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthResponse, type Club, type SignupInput, type User } from '../api/auth';
import { setUnauthorizedHandler, tokenStore } from '../api/client';

interface AuthState {
  user: User | null;
  club: Club | null;
  /** True while restoring a session from a stored token. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setClub(null);
  }, []);

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res.token);
    setUser(res.user);
    setClub(res.club);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then((res) => {
        setUser(res.user);
        setClub(res.club);
      })
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      club,
      loading,
      login: async (email, password) => accept(await authApi.login(email, password)),
      signup: async (input) => accept(await authApi.signup(input)),
      logout,
    }),
    [user, club, loading, accept, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
