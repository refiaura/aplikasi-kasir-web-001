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

/** Kategori produk. */
export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

/** Produk. price/cost integer rupiah; stockQty/minStock desimal (3 digit). */
export interface Product {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  price: number;
  cost: number;
  trackStock: boolean;
  stockQty: number;
  minStock: number;
  imageUrl: string | null;
  isActive: boolean;
  lowStock: boolean;
}

/** Mutasi stok. */
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: string;
  qty: number;
  unitCost: number | null;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
}
