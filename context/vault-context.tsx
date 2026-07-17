import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import {
  clearVaultSession,
  getStoredVaultSession,
  storeVaultSession,
  vaultLogin,
  vaultRegister,
} from '@/services/vaultAuth';
import type { VaultAuthState, VaultUser, VaultUserRole } from '@/types/vault';

interface VaultContextValue extends VaultAuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: VaultUserRole, barNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'SET_SESSION'; user: VaultUser; token: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR' };

function reducer(state: VaultAuthState, action: Action): VaultAuthState {
  switch (action.type) {
    case 'LOADING':     return { ...state, isLoading: true, error: null };
    case 'SET_SESSION': return { user: action.user, token: action.token, isLoading: false, error: null };
    case 'SET_ERROR':   return { ...state, isLoading: false, error: action.error };
    case 'CLEAR_ERROR': return { ...state, error: null };
    case 'CLEAR':       return { user: null, token: null, isLoading: false, error: null };
    default:            return state;
  }
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null, token: null, isLoading: true, error: null,
  });

  useEffect(() => {
    getStoredVaultSession()
      .then((session) => {
        if (session) dispatch({ type: 'SET_SESSION', user: session.user, token: session.token });
        else dispatch({ type: 'CLEAR' });
      })
      .catch(() => dispatch({ type: 'CLEAR' }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOADING' });
    try {
      const { token, user } = await vaultLogin(email, password);
      await storeVaultSession(token, user);
      dispatch({ type: 'SET_SESSION', user, token });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      throw err;
    }
  }, []);

  const register = useCallback(async (
    name: string, email: string, password: string, role: VaultUserRole, barNumber?: string,
  ) => {
    dispatch({ type: 'LOADING' });
    try {
      const { token, user } = await vaultRegister(name, email, password, role, barNumber);
      await storeVaultSession(token, user);
      dispatch({ type: 'SET_SESSION', user, token });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearVaultSession();
    dispatch({ type: 'CLEAR' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <VaultContext.Provider value={{ ...state, login, register, logout, clearError }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}
