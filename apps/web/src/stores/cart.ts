import type { CartItem, OpenBill, Product } from '@kasir/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dexieStorage, kasirDb } from '../lib/db';

export interface CartState {
  items: CartItem[];
  discountRp: number;
  discountPct: number;
  /** Kata sandi pemilik untuk menyetujui diskon (tidak disimpan permanen). */
  approvalPassword: string | null;
  addItem: (product: Product) => void;
  incQty: (productId: string) => void;
  decQty: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  setItemDiscount: (productId: string, discountRp: number, discountPct: number) => void;
  setItemNote: (productId: string, note: string) => void;
  removeItem: (productId: string) => void;
  setDiscount: (rp: number, pct: number) => void;
  setApprovalPassword: (pw: string | null) => void;
  clear: () => void;
  loadBill: (bill: OpenBill) => void;
  subtotal: () => number;
  discountTotal: () => number;
  total: () => number;
  count: () => number;
}

function lineDiscount(item: CartItem): number {
  const gross = item.qty * item.price;
  if (item.discountRp > 0) return Math.min(item.discountRp, gross);
  return Math.floor((gross * item.discountPct) / 100);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discountRp: 0,
      discountPct: 0,
      approvalPassword: null,

      addItem: (product) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === product.id ? { ...i, qty: Math.min(9999, i.qty + 1) } : i,
              ),
            };
          }
          const item: CartItem = {
            productId: product.id,
            name: product.name,
            unit: product.unit,
            price: product.price,
            imageUrl: product.imageUrl,
            qty: 1,
            discountRp: 0,
            discountPct: 0,
          };
          return { items: [...s.items, item] };
        }),

      incQty: (productId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId ? { ...i, qty: Math.min(9999, i.qty + 1) } : i,
          ),
        })),

      decQty: (productId) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.productId === productId ? { ...i, qty: i.qty - 1 } : i))
            .filter((i) => i.qty > 0),
        })),

      setQty: (productId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.productId !== productId)
              : s.items.map((i) => (i.productId === productId ? { ...i, qty: Math.min(9999, qty) } : i)),
        })),

      setItemDiscount: (productId, discountRp, discountPct) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId ? { ...i, discountRp, discountPct } : i,
          ),
        })),

      setItemNote: (productId, note) =>
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, note } : i)),
        })),

      removeItem: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      setDiscount: (rp, pct) => set({ discountRp: rp, discountPct: pct }),

      setApprovalPassword: (pw) => set({ approvalPassword: pw }),

      clear: () => set({ items: [], discountRp: 0, discountPct: 0, approvalPassword: null }),

      loadBill: (bill) =>
        set({
          items: bill.items,
          discountRp: bill.discountRp,
          discountPct: bill.discountPct,
          approvalPassword: null,
        }),

      subtotal: () => get().items.reduce((s, i) => s + i.qty * i.price, 0),

      discountTotal: () => {
        const s = get();
        const itemDisc = s.items.reduce((sum, i) => sum + lineDiscount(i), 0);
        const afterItems = s.subtotal() - itemDisc;
        const txnDisc = s.discountRp > 0 ? Math.min(s.discountRp, afterItems) : Math.floor((afterItems * s.discountPct) / 100);
        return itemDisc + txnDisc;
      },

      total: () => Math.max(0, get().subtotal() - get().discountTotal()),

      count: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    {
      name: 'cart-current',
      storage: dexieStorage<{ items: CartItem[]; discountRp: number; discountPct: number }>(),
      // Jangan persist fungsi & approvalPassword.
      partialize: (s) => ({
        items: s.items,
        discountRp: s.discountRp,
        discountPct: s.discountPct,
      }),
    },
  ),
);

/** Simpan keranjang berjalan sebagai pesanan (open bill) di perangkat. */
export async function saveOpenBill(name: string): Promise<void> {
  const s = useCart.getState();
  if (s.items.length === 0) throw new Error('Keranjang masih kosong.');
  const bill: OpenBill = {
    id: crypto.randomUUID(),
    name: name.trim() || `Pesanan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
    items: s.items,
    discountRp: s.discountRp,
    discountPct: s.discountPct,
    createdAt: Date.now(),
  };
  await kasirDb.openBills.add(bill);
}

export async function listOpenBills(): Promise<OpenBill[]> {
  return kasirDb.openBills.orderBy('createdAt').reverse().toArray();
}

export async function deleteOpenBill(id: string): Promise<void> {
  await kasirDb.openBills.delete(id);
}
