import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VaultUser } from '@/types/vault';

const VAULT_BASE = process.env.EXPO_PUBLIC_VAULT_BASE_URL ?? 'http://localhost:3002';
const TOKEN_KEY = '@lexvault/token';
const USER_KEY = '@lexvault/user';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${VAULT_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
    return data as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out — check vault server is running on port 3002');
    if (err.message === 'Network request failed' || err.message?.includes('Failed to fetch') || err.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Vault server at ${VAULT_BASE}. Please ensure vaultServer is running on port 3002.`);
    }
    throw err;
  }
}

export async function vaultLogin(email: string, password: string): Promise<{ token: string; user: VaultUser }> {
  return request('/vault/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function vaultRegister(
  name: string,
  email: string,
  password: string,
  role: string,
  barNumber?: string,
): Promise<{ token: string; user: VaultUser }> {
  return request('/vault/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, barNumber }),
  });
}

export async function vaultVerifyToken(token: string): Promise<VaultUser> {
  const data = await request<{ user: VaultUser }>('/vault/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.user;
}

export async function storeVaultSession(token: string, user: VaultUser): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function getStoredVaultSession(): Promise<{ token: string; user: VaultUser } | null> {
  const [token, userJson] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ]);
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}

export async function clearVaultSession(): Promise<void> {
  await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
}
