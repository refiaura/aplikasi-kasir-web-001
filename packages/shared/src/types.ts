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

/** Shift kasir. */
export interface Shift {
  id: string;
  deviceId: string;
  deviceName: string | null;
  openedByName: string | null;
  openingCash: number;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  openedAt: string;
  closedAt: string | null;
  cashIn: number;
  cashOut: number;
  cashSales: number;
}

/** Item dalam keranjang/transaksi. */
export interface CartItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  imageUrl: string | null;
  qty: number;
  discountRp: number;
  discountPct: number;
  note?: string;
}

/** Pembayaran dalam transaksi. */
export interface SalePayment {
  method: string;
  amount: number;
  cashReceived?: number | null;
  reference?: string | null;
}

/** Transaksi penjualan. */
export interface Sale {
  id: string;
  receiptNo: string;
  subtotal: number;
  discount: number;
  total: number;
  change: number;
  payments: SalePayment[];
  items: {
    productId: string;
    name: string;
    qty: number;
    unitPrice: number;
    discount: number;
    note: string | null;
  }[];
  cashierName: string | null;
  soldAt: string;
}

/** Pesanan tersimpan (open bill) di perangkat. */
export interface OpenBill {
  id: string;
  name: string;
  items: CartItem[];
  discountRp: number;
  discountPct: number;
  note?: string;
  createdAt: number;
}
