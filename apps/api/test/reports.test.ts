import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, setupCashier } from './helpers.js';

/**
 * Uji akurasi laporan: buat transaksi yang angkanya diketahui pasti,
 * bandingkan dengan perhitungan manual (seperti spreadsheet).
 */
describe('laporan', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  async function buatProduk(ownerCookie: string, name: string, price: number, cost: number) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { cookie: ownerCookie },
      payload: { name, price, cost, initialStock: 100 },
    });
    return res.json().product as { id: string };
  }

  async function jual(cookie: string, productId: string, qty: number, price: number) {
    const total = qty * price;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: {
        clientTxnId: randomUUID(),
        items: [{ productId, qty }],
        payments: [{ method: 'cash', amount: total, cashReceived: total }],
      },
    });
    if (res.statusCode !== 201) throw new Error(`Gagal jual: ${res.body}`);
    return res.json().sale as { id: string; total: number };
  }

  it('summary akurat: omzet, laba kotor, transaksi, per metode', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const a = await buatProduk(ownerCookie, 'Barang A', 10000, 6000);
    const b = await buatProduk(ownerCookie, 'Barang B', 20000, 12000);

    // Transaksi 1: 2x A tunai = 20000 (laba 8000)
    await jual(cookie, a.id, 2, 10000);
    // Transaksi 2: 1x B qris = 20000 (laba 8000)
    const t2 = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: {
        clientTxnId: randomUUID(),
        items: [{ productId: b.id, qty: 1 }],
        payments: [{ method: 'qris', amount: 20000, reference: 'QR1' }],
      },
    });
    expect(t2.statusCode).toBe(201);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/summary',
      headers: { cookie: ownerCookie },
    });
    expect(res.statusCode).toBe(200);
    const s = res.json().summary;
    expect(s.omzet).toBe(40000);
    expect(s.labaKotor).toBe(16000);
    expect(s.transaksi).toBe(2);
    expect(s.rataRata).toBe(20000);
    const cash = s.byMethod.find((m: { method: string }) => m.method === 'cash');
    const qris = s.byMethod.find((m: { method: string }) => m.method === 'qris');
    expect(cash.total).toBe(20000);
    expect(qris.total).toBe(20000);
  });

  it('top-products dan by-cashier akurat', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const a = await buatProduk(ownerCookie, 'Laris A', 5000, 2000);
    const b = await buatProduk(ownerCookie, 'Sepi B', 50000, 30000);

    await jual(cookie, a.id, 10, 5000); // omzet 50000
    await jual(cookie, b.id, 1, 50000); // omzet 50000

    const top = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/top-products?limit=5',
      headers: { cookie: ownerCookie },
    });
    expect(top.json().products[0].name).toBe('Laris A');
    expect(top.json().products[0].qty).toBe(10);

    const cs = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/by-cashier',
      headers: { cookie: ownerCookie },
    });
    expect(cs.json().cashiers).toHaveLength(1);
    expect(cs.json().cashiers[0].omzet).toBe(100000);
    expect(cs.json().cashiers[0].transaksi).toBe(2);
  });

  it('transaksi void tidak masuk laporan', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const a = await buatProduk(ownerCookie, 'Void A', 15000, 5000);

    const sale = await jual(cookie, a.id, 2, 15000);
    const v = await app.inject({
      method: 'POST',
      url: `/api/v1/sales/${sale.id}/void`,
      headers: { cookie: ownerCookie },
      payload: { reason: 'salah input' },
    });
    expect(v.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/summary',
      headers: { cookie: ownerCookie },
    });
    expect(res.json().summary.omzet).toBe(0);
    expect(res.json().summary.transaksi).toBe(0);
  });

  it('kasir tidak boleh akses laporan', async () => {
    app = await buildTestApp();
    const { cookie } = await setupCashier(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/summary',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(403);
  });
});
