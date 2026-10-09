import Dexie, { type Table } from 'dexie';
import type { OpenBill, SaleCreateInput, SyncDelta } from '@kasir/shared';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

export interface KvRow {
  id: string;
  value: unknown;
}

export interface OutboxSale {
  seq?: number;
  clientTxnId: string;
  /** Nomor nota lokal, mis. PERANGKAT-260109-0001. */
  localReceiptNo: string;
  payload: SaleCreateInput;
  createdAt: number;
  lastError?: string | null;
}

/** Katalog offline: hasil GET /sync. */
export interface CachedProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  unit: string;
  categoryId: string | null;
  isActive: boolean;
  trackStock: boolean;
  updatedAt: string;
}
export interface CachedCategory {
  id: string;
  name: string;
  updatedAt: string;
}
export interface CachedCustomer {
  id: string;
  name: string;
  phone: string | null;
  updatedAt: string;
}

/** Database lokal perangkat: keranjang, pesanan, katalog offline, antrean. */
class KasirDb extends Dexie {
  kv!: Table<KvRow, string>;
  openBills!: Table<OpenBill, string>;
  products!: Table<CachedProduct, string>;
  categories!: Table<CachedCategory, string>;
  customers!: Table<CachedCustomer, string>;
  outbox!: Table<OutboxSale, number>;

  constructor() {
    super('kasir-pos');
    this.version(1).stores({
      kv: 'id',
      openBills: 'id',
    });
    // Fase 5: katalog offline + antrean transaksi.
    this.version(2).stores({
      kv: 'id',
      openBills: 'id',
      products: 'id, name, barcode, categoryId, updatedAt',
      categories: 'id, updatedAt',
      customers: 'id, name, updatedAt',
      outbox: '++seq, clientTxnId',
    });
  }
}

export const kasirDb = new KasirDb();

/**
 * Storage adapter zustand/persist di atas Dexie (IndexedDB), agar keranjang
 * tidak hilang saat refresh — sesuai PRD Fase 3.
 */
export function dexieStorage<S>(): PersistStorage<S> {
  return {
    getItem: async (name: string): Promise<StorageValue<S> | null> => {
      const row = await kasirDb.kv.get(name);
      return (row?.value as StorageValue<S> | undefined) ?? null;
    },
    setItem: async (name: string, value: StorageValue<S>): Promise<void> => {
      await kasirDb.kv.put({ id: name, value });
    },
    removeItem: async (name: string): Promise<void> => {
      await kasirDb.kv.delete(name);
    },
  };
}

const SYNC_CURSOR_KEY = 'sync-cursor';

/** Tarik delta katalog dari server, simpan ke Dexie. Server menang bila konflik. */
export async function syncCatalog(fetchDelta: (since: string | null) => Promise<SyncDelta>): Promise<void> {
  const cursorRow = await kasirDb.kv.get(SYNC_CURSOR_KEY);
  const since = typeof cursorRow?.value === 'string' ? cursorRow.value : null;
  const delta = await fetchDelta(since);
  await kasirDb.transaction('rw', [kasirDb.products, kasirDb.categories, kasirDb.customers, kasirDb.kv], async () => {
    if (delta.products.length > 0) await kasirDb.products.bulkPut(delta.products);
    if (delta.categories.length > 0) await kasirDb.categories.bulkPut(delta.categories);
    if (delta.customers.length > 0) await kasirDb.customers.bulkPut(delta.customers);
    await kasirDb.kv.put({ id: SYNC_CURSOR_KEY, value: delta.now });
  });
}

/** Nomor nota lokal: KODE-YYMMDD-NNNN, counter harian per perangkat. */
export async function nextLocalReceiptNo(): Promise<string> {
  const deviceCode = (localStorage.getItem('kasir-device-code') || 'PERANGKAT').replace(/[^A-Z0-9-]/gi, '').toUpperCase();
  const today = new Date();
  const yymmdd = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const key = `local-receipt-${yymmdd}`;
  const row = await kasirDb.kv.get(key);
  const n = (typeof row?.value === 'number' ? row.value : 0) + 1;
  await kasirDb.kv.put({ id: key, value: n });
  return `${deviceCode}-${yymmdd}-${String(n).padStart(4, '0')}`;
}

/** Masukkan transaksi ke antrean offline. */
export async function queueOfflineSale(payload: SaleCreateInput): Promise<OutboxSale> {
  const localReceiptNo = await nextLocalReceiptNo();
  const item: OutboxSale = {
    clientTxnId: payload.clientTxnId,
    localReceiptNo,
    payload,
    createdAt: Date.now(),
    lastError: null,
  };
  const seq = await kasirDb.outbox.add(item);
  return { ...item, seq: seq as number };
}

export async function pendingOutboxCount(): Promise<number> {
  return kasirDb.outbox.count();
}

/**
 * Kirim antrean ke server (maks 50 per batch, idempoten via clientTxnId).
 * Mengembalikan jumlah terkirim; yang gagal tetap di antrean dengan lastError.
 */
export async function flushOutbox(
  sendBatch: (sales: SaleCreateInput[]) => Promise<{ clientTxnId: string; ok: boolean; duplicate?: boolean; error?: string }[]>,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (;;) {
    const batch = await kasirDb.outbox.orderBy('seq').limit(50).toArray();
    if (batch.length === 0) break;
    const results = await sendBatch(batch.map((b) => b.payload));
    const byId = new Map(results.map((r) => [r.clientTxnId, r]));
    for (const item of batch) {
      const r = byId.get(item.clientTxnId);
      if (r?.ok) {
        await kasirDb.outbox.delete(item.seq!);
        sent++;
      } else {
        await kasirDb.outbox.update(item.seq!, { lastError: r?.error ?? 'Gagal mengirim.' });
        failed++;
      }
    }
    if (batch.length < 50) break;
  }
  return { sent, failed };
}
