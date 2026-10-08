import type { UserRole } from './schemas.js';

export type { UserRole };

/** Pengguna yang sedang login (dari sesi server). */
export interface SessionUser {
  id: string;
  storeId: string;
  name: string;
  email: string | null;
  role: UserRole;
  permissions: Record<string, boolean>;
}

/** Toko milik sesi aktif. */
export interface SessionStore {
  id: string;
  name: string;
}

/** Respons /auth/me. */
export interface MeResponse {
  user: SessionUser;
  store: SessionStore;
}

/** Perangkat kasir terdaftar. */
export interface Device {
  id: string;
  code: string;
  name: string;
  lastSeenAt: string | null;
}

/** Ringkasan dashboard (Fase 1: angka nol). */
export interface DashboardSummary {
  store: SessionStore;
  today: {
    omzet: number;
    labaKotor: number;
    transaksi: number;
    kasbonAktif: number;
  };
  stokMenipis: unknown[];
  stokMinus: unknown[];
}
