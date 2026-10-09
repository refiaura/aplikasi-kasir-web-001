import { describe, expect, it } from 'vitest';
import { buildReceiptBytes, center, twoCol } from '../printer';

const sale = {
  id: 'x',
  receiptNo: 'INV-20260101-0001',
  subtotal: 30000,
  discount: 0,
  total: 30000,
  change: 20000,
  status: 'completed' as const,
  payments: [{ method: 'cash', amount: 30000, cashReceived: 50000, reference: null }],
  items: [{ productId: 'p1', name: 'Kopi Tubruk', qty: 2, unitPrice: 15000, discount: 0, note: null }],
  cashierName: 'Rina',
  soldAt: new Date('2026-01-01T10:00:00+07:00').toISOString(),
};

describe('ESC/POS', () => {
  it('twoCol pas 32 kolom', () => {
    expect(twoCol('Total', 'Rp30.000').length).toBe(32);
    expect(center('x').length).toBe(32);
  });

  it('byte diawali init ESC @ dan diakhiri potong kertas', () => {
    const bytes = buildReceiptBytes({ storeName: 'Toko Maju', sale });
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
    // GS V 0 = potong kertas di akhir
    expect(bytes[bytes.length - 3]).toBe(0x1d);
    expect(bytes[bytes.length - 2]).toBe(0x56);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('Toko Maju');
    expect(text).toContain('Kopi Tubruk');
    expect(text).toContain('INV-20260101-0001');
  });
});
