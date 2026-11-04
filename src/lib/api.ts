import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const TOKEN_KEY = 'movibot_token';

// Stockage cross-plateforme : localStorage sur le web, SecureStore sur natif.
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value) globalThis.localStorage?.setItem(key, value);
      else globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  try {
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

// URL de l'API (Apps Script de production). Surchargée via extra dans app.json si besoin.
const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  'https://script.google.com/macros/s/AKfycbxT1CnBf_EjRKh3s0AHrUyh2DG9mFU8bUlX8pe_Cu-SS9_qzxExqU0x227a1IbWh0OVhg/exec';

export async function getToken(): Promise<string | null> {
  return storageGet(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  return storageSet(TOKEN_KEY, token);
}

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function api<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
  const token = await getToken();
  const body = JSON.stringify({ action, token: token || '', ...payload });
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body,
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('Réponse illisible du serveur.');
  }
  if (!data.ok) {
    throw new ApiError(data.error || 'Erreur', data.code);
  }
  return data as T;
}

// Raccourcis typés
export type Conversation = {
  conv_id: string;
  user_id: string;
  title: string;
  persona_id: string;
  provider: string;
  model: string;
  summary: string;
  summarized_until: string;
  created_at: string;
  updated_at: string;
  archived: string | boolean;
  has_messages?: boolean;
};

export type ToolEvent = {type: string; status: string; label: string};
export type Message = {
  tool_events?: ToolEvent[];
  msg_id: string;
  conv_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_est: number;
  provider: string;
  model: string;
  created_at: string;
};

export type Model = {
  model_id: string;
  provider: string;
  display_name: string;
  context_max: number;
  output_max: number;
  supports_vision: boolean;
  supports_streaming: boolean;
  enabled: boolean;
};

export type User = {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  preferred_provider: string;
  preferred_model: string;
  detail_level: string;
};

export function isWeb(): boolean {
  return Platform.OS === 'web';
}
