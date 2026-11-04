import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Local-only data; namespaced per account. Never sent as agent memory.
export async function readLocal<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) : await SecureStore.getItemAsync(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}
export async function writeLocal<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, raw);
  else await SecureStore.setItemAsync(key, raw);
}
export const accountKey = (id?: string) => `movibot_${(id || 'guest').replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
