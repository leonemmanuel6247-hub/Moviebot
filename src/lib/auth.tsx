import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, type User } from './api';

export type DetailLevel = 'concise' | 'balanced' | 'detailed';

interface AuthState {
  user: User | null;
  ready: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setDetailLevel: (level: DetailLevel) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await api<{ user: User }>('me');
      setUser(d.user);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const signIn = useCallback(async (token: string, u: User) => {
    await setToken(token);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api('logout');
    } catch {
      // ignore
    }
    await setToken(null);
    setUser(null);
  }, []);

  const setDetailLevel = useCallback((level: DetailLevel) => {
    setUser((u) => (u ? { ...u, detail_level: level } : u));
  }, []);

  return (
    <Ctx.Provider value={{ user, ready, signIn, signOut, refresh, setDetailLevel }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
