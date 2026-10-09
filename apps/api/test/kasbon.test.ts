import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { customers, products } from '../src/db/schema.js';
import { buildTestApp, setupCashier } from './helpers.js';
import { testDb } from './setup.js';

describe('kasbon', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  async function siapkan() {
    app = await buildTestApp();
    const ctx = await setupCashier(app);
    const pRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { cookie: ctx.ownerCookie },
      payload: { name: 'Kopi', price: 15000, cost: 6000, initialStock: 50 },
    });
    const product = pRes.json().product as { id: string };
    const cRes = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      headers: { cookie: ctx.ownerCookie },
      payload: { name: 'Bu Sari', phone: '0812' },
    });
    expect(cRes.statusCode).toBe(201);
    const customer = cRes.json().customer as { id: string };
    return { ...ctx, product, customer };
  }

  function jualKasbon(cookie: string, productId: string, customerId: string) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: {
        clientTxnId: randomUUID(),
        items: [{ productId, qty: 2 }],
        payments: [{ method: 'kasbon', amount: 30000 }],
        customerId,
      },
    });
  }

  it('jual kasbon: wajib pelanggan, saldo bertambah', async () => {
    const { cookie, ownerCookie, product, customer } = await siapkan();

    const tanpaPelanggan = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: {
        clientTxnId: randomUUID(),
        items: [{ productId: product.id, qty: 1 }],
        payments: [{ method: 'kasbon', amount: 15000 }],
      },
    });
    expect(tanpaPelanggan.statusCode).toBe(400);

    const ok = await jualKasbon(cookie, product.id, customer.id);
    expect(ok.statusCode).toBe(201);
    expect(ok.json().sale.total).toBe(30000);

    const [c] = await testDb!.select().from(customers).where(eq(customers.id, customer.id));
    expect(c!.kasbonBalance).toBe(30000);

    const riwayat = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${customer.id}/kasbon`,
      headers: { cookie: ownerCookie },
    });
    expect(riwayat.json().entries).toHaveLength(1);
    expect(riwayat.json().entries[0].amount).toBe(30000);
  });

  it('bayar kasbon sebagian lalu lunas; tolak kelebihan', async () => {
    const { cookie, product, customer } = await siapkan();
    await jualKasbon(cookie, product.id, customer.id); // 30000

    const bayar1 = await app.inject({
      method: 'POST',
      url: `/api/v1/customers/${customer.id}/kasbon-payments`,
      headers: { cookie },
      payload: { amount: 10000, method: 'cash', note: 'cicilan' },
    });
    expect(bayar1.statusCode).toBe(201);
    expect(bayar1.json().customer.kasbonBalance).toBe(20000);

    const lebih = await app.inject({
      method: 'POST',
      url: `/api/v1/customers/${customer.id}/kasbon-payments`,
      headers: { cookie },
      payload: { amount: 50000, method: 'cash' },
    });
    expect(lebih.statusCode).toBe(400);

    const lunas = await app.inject({
      method: 'POST',
      url: `/api/v1/customers/${customer.id}/kasbon-payments`,
      headers: { cookie },
      payload: { amount: 20000, method: 'transfer', reference: 'TRF1' },
    });
    expect(lunas.json().customer.kasbonBalance).toBe(0);
  });

  it('void mengembalikan stok dan membalik kasbon', async () => {
    const { cookie, ownerCookie, product, customer } = await siapkan();
    const jual = await jualKasbon(cookie, product.id, customer.id);
    const saleId = jual.json().sale.id as string;

    const v = await app.inject({
      method: 'POST',
      url: `/api/v1/sales/${saleId}/void`,
      headers: { cookie: ownerCookie },
      payload: { reason: 'batal' },
    });
    expect(v.statusCode).toBe(200);

    const [p] = await testDb!.select().from(products).where(eq(products.id, product.id));
    expect(Number(p!.stockQty)).toBe(50); // kembali seperti semula

    const [c] = await testDb!.select().from(customers).where(eq(customers.id, customer.id));
    expect(c!.kasbonBalance).toBe(0); // hutang dibalik

    // Void kedua kali ditolak
    const v2 = await app.inject({
      method: 'POST',
      url: `/api/v1/sales/${saleId}/void`,
      headers: { cookie: ownerCookie },
      payload: { reason: 'lagi' },
    });
    expect(v2.statusCode).toBe(409);
  });

  it('kasir void butuh persetujuan pemilik', async () => {
    const { cookie, product } = await siapkan();
    const jual = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      headers: { cookie },
      payload: {
        clientTxnId: randomUUID(),
        items: [{ productId: product.id, qty: 1 }],
        payments: [{ method: 'cash', amount: 15000, cashReceived: 15000 }],
      },
    });
    const saleId = jual.json().sale.id as string;

    const tanpa = await app.inject({
      method: 'POST',
      url: `/api/v1/sales/${saleId}/void`,
      headers: { cookie },
      payload: { reason: 'salah' },
    });
    expect(tanpa.statusCode).toBe(403);

    const salah = await app.inject({
      method: 'POST',
      url: `/api/v1/sales/${saleId}/void`,
      headers: { cookie },
      payload: { reason: 'salah', approvalPassword: 'keliru' },
    });
    expect(salah.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'POST',
      url: `/api/v1/sales/${saleId}/void`,
      headers: { cookie },
      payload: { reason: 'salah', approvalPassword: 'rahasia123' },
    });
    expect(ok.statusCode).toBe(200);
  });

  it('isolasi: pelanggan toko lain tak terlihat', async () => {
    const a = await siapkan();
    const b = await siapkan();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/customers/${a.customer.id}`,
      headers: { cookie: b.ownerCookie },
    });
    expect(res.statusCode).toBe(404);
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      headers: { cookie: b.ownerCookie },
    });
    expect(list.json().customers).toHaveLength(1);
    expect(list.json().customers[0].id).toBe(b.customer.id);
  });
});
