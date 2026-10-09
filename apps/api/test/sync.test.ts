import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { uuidv7 } from '@kasir/shared';
import type { SyncDelta } from '@kasir/shared';
import { products } from '../src/db/schema.js';
import { buildTestApp, setupCashier } from './helpers.js';
import { testDb } from './setup.js';

describe('sync & offline batch', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('GET /sync: semua data lalu hanya delta', async () => {
    app = await buildTestApp();
    const { ownerCookie } = await setupCashier(app);

    const p = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { cookie: ownerCookie },
      payload: { name: 'Sync A', price: 10000, cost: 5000, initialStock: 10 },
    });
    const productId = p.json().product.id as string;

    const full = await app.inject({ method: 'GET', url: '/api/v1/sync', headers: { cookie: ownerCookie } });
    expect(full.statusCode).toBe(200);
    const delta1 = full.json() as SyncDelta;
    expect(delta1.products.length).toBeGreaterThanOrEqual(1);
    expect(delta1.now).toBeTruthy();

    // Ubah produk → delta berikutnya hanya berisi perubahan.
    // Jeda agar updatedAt pasti lebih baru dari cursor (presisi ms).
    await new Promise((r) => setTimeout(r, 15));
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${productId}`,
      headers: { cookie: ownerCookie },
      payload: { price: 12000 },
    });
    const delta2 = (await app.inject({
      method: 'GET',
      url: `/api/v1/sync?since=${encodeURIComponent(delta1.now)}`,
      headers: { cookie: ownerCookie },
    })).json() as SyncDelta;
    expect(delta2.products).toHaveLength(1);
    expect(delta2.products[0]!.price).toBe(12000);
    expect(delta2.customers).toHaveLength(0);
  });

  it('uuidv7 valid dan membawa timestamp', () => {
    const before = Date.now();
    const a = uuidv7();
    const b = uuidv7();
    const after = Date.now();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
    // 48 bit pertama = timestamp ms.
    const ts = Number.parseInt(a.replace(/-/g, '').slice(0, 12), 16);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('batch 200 transaksi: tidak ada duplikat, stok benar', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { cookie: ownerCookie },
      payload: { name: 'Batch X', price: 5000, cost: 2000, initialStock: 1000 },
    });
    const productId = p.json().product.id as string;

    // Simulasi antrean offline: 200 transaksi, tiap 10 duplikat (kirim ulang).
    const sales = Array.from({ length: 200 }, () => ({
      clientTxnId: uuidv7(),
      items: [{ productId, qty: 2 }],
      payments: [{ method: 'cash', amount: 10000, cashReceived: 10000 }],
    }));
    const withDupes = [...sales];
    for (let i = 0; i < 200; i += 10) withDupes.push(sales[i]!); // 20 duplikat

    // Kirim per 50 (batas batch).
    let created = 0;
    let duplicates = 0;
    for (let i = 0; i < withDupes.length; i += 50) {
      const chunk = withDupes.slice(i, i + 50);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sales/batch',
        headers: { cookie },
        payload: { sales: chunk },
      });
      expect(res.statusCode).toBe(200);
      for (const r of res.json().results as { ok: boolean; duplicate?: boolean }[]) {
        if (r.ok && !r.duplicate) created++;
        if (r.duplicate) duplicates++;
      }
    }
    expect(created).toBe(200);
    expect(duplicates).toBe(20);

    // Stok: 1000 - 200*2 = 600.
    const [row] = await testDb!.select().from(products).where(eq(products.id, productId));
    expect(Number(row!.stockQty)).toBe(600);

    // Laporan cocok: 200 × 10000.
    const rep = await app.inject({ method: 'GET', url: '/api/v1/reports/summary', headers: { cookie: ownerCookie } });
    expect(rep.json().summary.omzet).toBe(2_000_000);
    expect(rep.json().summary.transaksi).toBe(200);
  }, 120000);
});
