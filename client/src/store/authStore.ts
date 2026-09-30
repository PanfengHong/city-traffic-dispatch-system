import { create } from 'zustand';
import type { User } from '../types';
import { login as apiLogin, getMe } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('traffic_token'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const { token, user } = await apiLogin(username, password);
      localStorage.setItem('traffic_token', token);
      set({ token, user, loading: false });
    } catch (e: any) {
      set({ error: e.message || '登录失败', loading: false });
      throw e;
    }
  },

  restore: async () => {
    const token = localStorage.getItem('traffic_token');
    if (!token) return;
    try {
      const user = await getMe();
      set({ user, token });
    } catch {
      localStorage.removeItem('traffic_token');
      set({ token: null, user: null });
    }
  },

  logout: () => {
    localStorage.removeItem('traffic_token');
    set({ user: null, token: null });
  },
}));
