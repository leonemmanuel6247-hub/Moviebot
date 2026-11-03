import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getTheme, type Theme, type ThemeMode } from '../theme';

const MODE_KEY = 'movibot_theme';

async function loadMode(): Promise<ThemeMode | null> {
  try {
    const saved =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(MODE_KEY)
        : await SecureStore.getItemAsync(MODE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
  } catch {
    // ignore
  }
  return null;
}

function saveMode(m: ThemeMode): void {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(MODE_KEY, m);
    else SecureStore.setItemAsync(MODE_KEY, m);
  } catch {
    // ignore
  }
}

interface ThemeState {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    (async () => {
      const saved = await loadMode();
      if (saved) setModeState(saved);
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    saveMode(m);
  }, []);

  const theme = getTheme(mode, system === 'dark');

  return <Ctx.Provider value={{ theme, mode, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}
