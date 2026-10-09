import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { products, stockMovements } from '../src/db/schema.js';
import { buildTestApp, registerOwner } from './helpers.js';
import { testDb } from './setup.js';

async function buatProdukStok(app: FastifyInstance, cookie: string, storeId: string) {
  const [p] = await testDb!
    .insert(products)
    .values({ storeId, name: 'Gula 1kg', price: 17500, cost: 16000, stockQty: '20', minStock: '5' })
    .returning({ id: products.id });
  return p!.id;
}

describe('mutasi stok', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('stok masuk: stok bertambah + harga modal terupdate + mutasi tercatat', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app);
    const productId = await buatProdukStok(app, cookie, body.store.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/stock/movements',
      headers: { cookie },
      payload: { productId, type: 'purchase', qty: 10, unitCost: 16500, note: 'Kulakan mingguan' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().movement.qty).toBe(10);

    const [p] = await testDb!.select().from(products).where(eq(products.id, productId));
    expect(Number(p!.stockQty)).toBe(30);
    expect(p!.cost).toBe(16500);

    const mvs = await testDb!.select().from(stockMovements).where(eq(stockMovements.productId, productId));
    expect(mvs).toHaveLength(1);
    expect(mvs[0]!.note).toBe('Kulakan mingguan');
  });

  it('penyesuaian wajib alasan; qty negatif mengurangi stok', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app);
    const productId = await buatProdukStok(app, cookie, body.store.id);

    const tanpaAlasan = await app.inject({
      method: 'POST',
      url: '/api/v1/stock/movements',
      headers: { cookie },
      payload: { productId, type: 'adjustment', qty: -2 },
    });
    expect(tanpaAlasan.statusCode).toBe(400);
    expect(tanpaAlasan.json().message).toBe('Alasan penyesuaian wajib diisi.');

    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/stock/movements',
      headers: { cookie },
      payload: { productId, type: 'adjustment', qty: -2, note: 'Opname: selisih 2' },
    });
    expect(ok.statusCode).toBe(201);

    const [p] = await testDb!.select().from(products).where(eq(products.id, productId));
    expect(Number(p!.stockQty)).toBe(18);
  });

  it('stok masuk qty negatif ditolak', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app);
    const productId = await buatProdukStok(app, cookie, body.store.id);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/stock/movements',
      headers: { cookie },
      payload: { productId, type: 'purchase', qty: -5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('produk toko lain → 404; produk tanpa track_stock → 400', async () => {
    app = await buildTestApp();
    const a = await registerOwner(app, { email: 'st-a@toko.id' });
    const b = await registerOwner(app, { email: 'st-b@toko.id' });
    const productId = await buatProdukStok(app, a.cookie, a.body.store.id);

    const silang = await app.inject({
      method: 'POST',
      url: '/api/v1/stock/movements',
      headers: { cookie: b.cookie },
      payload: { productId, type: 'purchase', qty: 5 },
    });
    expect(silang.statusCode).toBe(404);

    const [nonTrack] = await testDb!
      .insert(products)
      .values({ storeId: a.body.store.id, name: 'Jasa', price: 10000, trackStock: false })
      .returning({ id: products.id });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/stock/movements',
      headers: { cookie: a.cookie },
      payload: { productId: nonTrack!.id, type: 'purchase', qty: 5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('riwayat mutasi menampilkan nama produk dan pembuat', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app);
    const productId = await buatProdukStok(app, cookie, body.store.id);
    await app.inject({
      method: 'POST',
      url: '/api/v1/stock/movements',
      headers: { cookie },
      payload: { productId, type: 'purchase', qty: 5, note: 'Uji riwayat' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/stock/movements?product_id=${productId}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const [mv] = res.json().movements;
    expect(mv.productName).toBe('Gula 1kg');
    expect(mv.createdByName).toBe('Pemilik Toko');
    expect(mv.qty).toBe(5);
  });
});
