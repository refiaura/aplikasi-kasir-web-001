import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { products, sales, stockMovements } from '../src/db/schema.js';
import { buildTestApp, sessionCookie, setupCashier } from './helpers.js';
import { testDb } from './setup.js';

async function buatProduk(ownerCookie: string, app: FastifyInstance, overrides: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/products',
    headers: { cookie: ownerCookie },
    payload: { name: 'Kopi Susu', price: 15000, cost: 6000, initialStock: 100, ...overrides },
  });
  if (res.statusCode !== 201) throw new Error(`Gagal buat produk: ${res.body}`);
  return res.json().product as { id: string; price: number };
}

function payloadJual(productId: string, overrides: Record<string, unknown> = {}) {
  return {
    clientTxnId: randomUUID(),
    items: [{ productId, qty: 2 }],
    payments: [{ method: 'cash', amount: 30000, cashReceived: 50000 }],
    ...overrides,
  };
}

describe('penjualan', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('jual tunai: stok berkurang, mutasi tercatat, kembalian benar', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await buatProduk(ownerCookie, app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id),
    });
    expect(res.statusCode).toBe(201);
    const sale = res.json().sale;
    expect(sale.receiptNo).toMatch(/^INV-\d{8}-\d{4}$/);
    expect(sale.total).toBe(30000);
    expect(sale.change).toBe(20000);
    expect(sale.items[0].unitPrice).toBe(15000);

    const [prod] = await testDb!.select().from(products).where(eq(products.id, p.id));
    expect(Number(prod!.stockQty)).toBe(98);
    const mvs = await testDb!.select().from(stockMovements).where(eq(stockMovements.productId, p.id));
    const saleMv = mvs.find((m) => m.type === 'sale');
    expect(saleMv).toBeDefined();
    expect(Number(saleMv!.qty)).toBe(-2);
  });

  it('tanpa shift terbuka → 409', async () => {
    app = await buildTestApp();
    const ctx = await setupCashier(app);
    await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${ctx.shiftId}/close`,
      headers: { cookie: ctx.cookie },
      payload: { countedCash: 100000 },
    });
    const p = await buatProduk(ctx.ownerCookie, app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie: ctx.cookie },
      payload: payloadJual(p.id),
    });
    expect(res.statusCode).toBe(409);
  });

  it('idempoten: clientTxnId sama → kembalikan transaksi lama', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await buatProduk(ownerCookie, app);
    const body = payloadJual(p.id);

    const r1 = await app.inject({ method: 'POST', url: '/api/v1/sales', headers: { cookie }, payload: body });
    const r2 = await app.inject({ method: 'POST', url: '/api/v1/sales', headers: { cookie }, payload: body });
    expect(r1.statusCode).toBe(201);
    expect(r2.statusCode).toBe(200);
    expect(r2.json().duplicate).toBe(true);
    expect(r2.json().sale.id).toBe(r1.json().sale.id);

    const rows = await testDb!.select().from(sales);
    expect(rows).toHaveLength(1);
    const [prod] = await testDb!.select().from(products).where(eq(products.id, p.id));
    expect(Number(prod!.stockQty)).toBe(98); // hanya berkurang sekali
  });

  it('diskon butuh izin atau persetujuan pemilik', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await buatProduk(ownerCookie, app);

    const tanpaIzin = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, {
        items: [{ productId: p.id, qty: 2, discountPct: 10 }],
        payments: [{ method: 'cash', amount: 27000, cashReceived: 30000 }],
      }),
    });
    expect(tanpaIzin.statusCode).toBe(403);

    const pinSalah = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, {
        items: [{ productId: p.id, qty: 2, discountPct: 10 }],
        payments: [{ method: 'cash', amount: 27000, cashReceived: 30000 }],
        approvalPassword: 'salah123',
      }),
    });
    expect(pinSalah.statusCode).toBe(403);

    const disetujui = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, {
        items: [{ productId: p.id, qty: 2, discountPct: 10 }],
        payments: [{ method: 'cash', amount: 27000, cashReceived: 30000 }],
        approvalPassword: 'rahasia123',
      }),
    });
    expect(disetujui.statusCode).toBe(201);
    expect(disetujui.json().sale.discount).toBe(3000);
    expect(disetujui.json().sale.total).toBe(27000);
  });

  it('kasir berizin diskon bisa memberi diskon transaksi', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app, { permissions: { discount: true } });
    const p = await buatProduk(ownerCookie, app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, {
        discountRp: 5000,
        payments: [{ method: 'cash', amount: 25000, cashReceived: 25000 }],
      }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().sale.discount).toBe(5000);
  });

  it('validasi: total klien beda, bayar kurang, kasbon, diskon over', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await buatProduk(ownerCookie, app);

    const beda = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, { clientTotal: 99999 }),
    });
    expect(beda.statusCode).toBe(400);

    const kurang = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, { payments: [{ method: 'cash', amount: 20000, cashReceived: 20000 }] }),
    });
    expect(kurang.statusCode).toBe(400);

    const kasbon = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, { payments: [{ method: 'kasbon', amount: 30000 }] }),
    });
    expect(kasbon.statusCode).toBe(400);
    expect(kasbon.json().message).toContain('Fase 4');

    const over = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, {
        items: [{ productId: p.id, qty: 1, discountRp: 99999 }],
        payments: [{ method: 'cash', amount: 1, cashReceived: 1 }],
        approvalPassword: 'rahasia123',
      }),
    });
    expect(over.statusCode).toBe(400);
  });

  it('split payment tunai + qris', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await buatProduk(ownerCookie, app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: payloadJual(p.id, {
        payments: [
          { method: 'cash', amount: 10000, cashReceived: 10000 },
          { method: 'qris', amount: 20000, reference: 'QR123' },
        ],
      }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().sale.payments).toHaveLength(2);
    expect(res.json().sale.change).toBe(0);
  });

  it('konkurensi: 5 penjualan paralel tak ada stok hilang', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await buatProduk(ownerCookie, app, { name: 'Stok Rebut', initialStock: 10 });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.inject({
          method: 'POST',
          url: '/api/v1/sales',
          headers: { cookie },
          payload: payloadJual(p.id, {
            items: [{ productId: p.id, qty: 3 }],
            payments: [{ method: 'cash', amount: 45000, cashReceived: 50000 }],
          }),
        }),
      ),
    );
    expect(results.every((r) => r.statusCode === 201)).toBe(true);
    const receiptNos = results.map((r) => r.json().sale.receiptNo);
    expect(new Set(receiptNos).size).toBe(5); // nomor struk unik semua

    const [prod] = await testDb!.select().from(products).where(eq(products.id, p.id));
    expect(Number(prod!.stockQty)).toBe(10 - 5 * 3); // -5, tepat tanpa lost update
  });

  it('batch: kirim 2, satu duplikat', async () => {
    app = await buildTestApp();
    const { cookie, ownerCookie } = await setupCashier(app);
    const p = await buatProduk(ownerCookie, app);
    const s1 = payloadJual(p.id);
    const s2 = payloadJual(p.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales/batch',
      headers: { cookie },
      payload: { sales: [s1, s2, s1] },
    });
    expect(res.statusCode).toBe(200);
    const results = res.json().results;
    expect(results).toHaveLength(3);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(true);
    expect(results[2].ok).toBe(true);
    expect(results[2].duplicate).toBe(true);
    expect(results[2].saleId).toBe(results[0].saleId);
  });

  it('riwayat: kasir hanya lihat perangkatnya; pemilik lihat semua', async () => {
    app = await buildTestApp();
    const a = await setupCashier(app, { ownerEmail: 'sl-a@toko.id' });
    await setupCashier(app, { ownerEmail: 'sl-b@toko.id' });
    const pa = await buatProduk(a.ownerCookie, app);
    await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie: a.cookie },
      payload: payloadJual(pa.id),
    });

    const listA = await app.inject({ method: 'GET', url: '/api/v1/sales', headers: { cookie: a.cookie } });
    expect(listA.json().total).toBe(1);

    // Kasir kedua di toko yang sama, perangkat berbeda
    await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { cookie: a.ownerCookie },
      payload: { code: 'KASIR-A2', name: 'Tablet 2' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { cookie: a.ownerCookie },
      payload: { name: 'Kasir Dua', pin: '654321' },
    });
    const pinRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin',
      payload: { deviceCode: 'KASIR-A2', pin: '654321' },
    });
    const cookie2 = sessionCookie(pinRes);

    const saleId = listA.json().sales[0].id as string;
    const detailLain = await app.inject({
      method: 'GET',
      url: `/api/v1/sales/${saleId}`,
      headers: { cookie: cookie2 },
    });
    expect(detailLain.statusCode).toBe(403);
    const detailOwner = await app.inject({
      method: 'GET',
      url: `/api/v1/sales/${saleId}`,
      headers: { cookie: a.ownerCookie },
    });
    expect(detailOwner.statusCode).toBe(200);
    expect(detailOwner.json().sale.items).toHaveLength(1);
  });
});
