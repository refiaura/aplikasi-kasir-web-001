import type { MeResponse } from '@kasir/shared';
import { create } from 'zustand';
import { get, post } from '../lib/api';

interface SessionState {
  user: MeResponse['user'] | null;
  store: MeResponse['store'] | null;
  loading: boolean;
  initialized: boolean;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  store: null,
  loading: false,
  initialized: false,

  fetchMe: async () => {
    set({ loading: true });
    try {
      const me = await get<MeResponse>('/auth/me');
      set({ user: me.user, store: me.store, initialized: true });
    } catch {
      set({ user: null, store: null, initialized: true });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await post('/auth/logout');
    } catch {
      // Abaikan: sesi lokal tetap dibersihkan.
    }
    set({ user: null, store: null });
  },
}));
