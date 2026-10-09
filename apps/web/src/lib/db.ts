import Dexie, { type Table } from 'dexie';
import type { OpenBill } from '@kasir/shared';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

export interface KvRow {
  id: string;
  value: unknown;
}

/** Database lokal perangkat: keranjang persisten + pesanan tersimpan. */
class KasirDb extends Dexie {
  kv!: Table<KvRow, string>;
  openBills!: Table<OpenBill, string>;

  constructor() {
    super('kasir-pos');
    this.version(1).stores({
      kv: 'id',
      openBills: 'id',
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
