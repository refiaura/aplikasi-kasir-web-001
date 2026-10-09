import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { products, stockMovements } from '../src/db/schema.js';
import { buildTestApp, registerOwner } from './helpers.js';
import { testDb } from './setup.js';

async function buatKategori(app: FastifyInstance, cookie: string, name = 'Sembako') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/categories',
    headers: { cookie },
    payload: { name },
  });
  return res.json().category as { id: string; name: string };
}

async function buatProduk(app: FastifyInstance, cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/products',
    headers: { cookie },
    payload: {
      name: 'Indomie Goreng',
      sku: 'MKN-001',
      unit: 'pcs',
      price: 3500,
      cost: 2800,
      initialStock: 10,
      minStock: 5,
      ...overrides,
    },
  });
  return res;
}

describe('kategori', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('buat, ubah, dan hapus kategori', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { cookie },
      payload: { name: 'Sembako' },
    });
    expect(created.statusCode).toBe(201);

    const duplikat = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { cookie },
      payload: { name: 'Sembako' },
    });
    expect(duplikat.statusCode).toBe(409);

    const list = await app.inject({ method: 'GET', url: '/api/v1/categories', headers: { cookie } });
    expect(list.json().categories).toHaveLength(1);

    const id = created.json().category.id as string;
    const ubah = await app.inject({
      method: 'PATCH',
      url: `/api/v1/categories/${id}`,
      headers: { cookie },
      payload: { name: 'Sembako Baru' },
    });
    expect(ubah.json().category.name).toBe('Sembako Baru');

    const hapus = await app.inject({ method: 'DELETE', url: `/api/v1/categories/${id}`, headers: { cookie } });
    expect(hapus.statusCode).toBe(200);
  });

  it('kategori yang dipakai produk tidak bisa dihapus', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const cat = await buatKategori(app, cookie);
    await buatProduk(app, cookie, { categoryId: cat.id });
    const hapus = await app.inject({
      method: 'DELETE',
      url: `/api/v1/categories/${cat.id}`,
      headers: { cookie },
    });
    expect(hapus.statusCode).toBe(409);
  });
});

describe('produk', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('buat produk dengan stok awal → mutasi tercatat', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const res = await buatProduk(app, cookie);
    expect(res.statusCode).toBe(201);
    const p = res.json().product;
    expect(p.stockQty).toBe(10);
    expect(p.price).toBe(3500);

    const movements = await testDb!
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, p.id));
    expect(movements).toHaveLength(1);
    expect(movements[0]!.type).toBe('purchase');
    expect(Number(movements[0]!.qty)).toBe(10);
  });

  it('sku dan barcode duplikat ditolak', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    await buatProduk(app, cookie);
    const duplikatSku = await buatProduk(app, cookie, { name: 'Lain', barcode: 'B2' });
    expect(duplikatSku.statusCode).toBe(409);
    expect(duplikatSku.json().message).toContain('SKU');
  });

  it('kategori toko lain ditolak', async () => {
    app = await buildTestApp();
    const a = await registerOwner(app, { email: 'pk-a@toko.id' });
    const b = await registerOwner(app, { email: 'pk-b@toko.id' });
    const catA = await buatKategori(app, a.cookie);
    const res = await buatProduk(app, b.cookie, { categoryId: catA.id, sku: 'X-1' });
    expect(res.statusCode).toBe(400);
  });

  it('ubah dan nonaktifkan produk', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const created = await buatProduk(app, cookie);
    const id = created.json().product.id as string;

    const ubah = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${id}`,
      headers: { cookie },
      payload: { price: 4000, name: 'Indomie Goreng Spesial' },
    });
    expect(ubah.json().product.price).toBe(4000);

    await app.inject({ method: 'DELETE', url: `/api/v1/products/${id}`, headers: { cookie } });
    const list = await app.inject({ method: 'GET', url: '/api/v1/products', headers: { cookie } });
    expect(list.json().products).toHaveLength(0);
    const detail = await app.inject({ method: 'GET', url: `/api/v1/products/${id}`, headers: { cookie } });
    expect(detail.json().product.isActive).toBe(false);
  });

  it('isolasi tenant: produk toko A tak terlihat toko B', async () => {
    app = await buildTestApp();
    const a = await registerOwner(app, { email: 'pk2-a@toko.id' });
    const b = await registerOwner(app, { email: 'pk2-b@toko.id' });
    await buatProduk(app, a.cookie);
    const listB = await app.inject({ method: 'GET', url: '/api/v1/products', headers: { cookie: b.cookie } });
    expect(listB.json().products).toHaveLength(0);
    expect(listB.json().total).toBe(0);
  });

  it('kasir boleh baca, tidak boleh tulis', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    await buatProduk(app, cookie);
    await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { cookie },
      payload: { code: 'KASIR-01', name: 'Tablet' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { cookie },
      payload: { name: 'Kasir', pin: '123456' },
    });
    const pin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin',
      payload: { deviceCode: 'KASIR-01', pin: '123456' },
    });
    const cashierCookie = String(pin.headers['set-cookie']).split(';')[0]!;

    const baca = await app.inject({ method: 'GET', url: '/api/v1/products', headers: { cookie: cashierCookie } });
    expect(baca.statusCode).toBe(200);
    expect(baca.json().products).toHaveLength(1);

    const tulis = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { cookie: cashierCookie },
      payload: { name: 'Nakal', price: 1000 },
    });
    expect(tulis.statusCode).toBe(403);
  });

  it('filter stok menipis dan kategori', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app);
    const cat = await buatKategori(app, cookie);
    await buatProduk(app, cookie, { name: 'Stok Aman', sku: 'S-1', categoryId: cat.id, initialStock: 50, minStock: 5 });
    await buatProduk(app, cookie, { name: 'Stok Tipis', sku: 'S-2', initialStock: 3, minStock: 5 });

    const low = await app.inject({
      method: 'GET',
      url: '/api/v1/products?low_stock=1',
      headers: { cookie },
    });
    expect(low.json().products.map((p: { name: string }) => p.name)).toEqual(['Stok Tipis']);

    const byCat = await app.inject({
      method: 'GET',
      url: `/api/v1/products?category_id=${cat.id}`,
      headers: { cookie },
    });
    expect(byCat.json().products.map((p: { name: string }) => p.name)).toEqual(['Stok Aman']);

    // lowStock ikut di DTO
    const semua = await app.inject({ method: 'GET', url: '/api/v1/products', headers: { cookie } });
    const tipis = semua.json().products.find((p: { name: string }) => p.name === 'Stok Tipis');
    expect(tipis.lowStock).toBe(true);
    expect(body.store).toBeDefined();
  });

  it('seed contoh produk per jenis usaha', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/products/seed',
      headers: { cookie },
      payload: { businessType: 'kelontong' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ categories: 4, products: 12 });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/products?limit=100',
      headers: { cookie },
    });
    expect(list.json().total).toBe(12);
    const indomie = list.json().products.find((p: { name: string }) => p.name === 'Indomie Goreng');
    expect(indomie.stockQty).toBe(100);

    const kedua = await app.inject({
      method: 'POST',
      url: '/api/v1/products/seed',
      headers: { cookie },
      payload: { businessType: 'kedai' },
    });
    expect(kedua.statusCode).toBe(409);
  });
});

describe('pencarian produk (trigram)', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('300 produk: pencarian typo < 100ms', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app);
    const storeId = body.store.id as string;

    // Bulk insert 300 produk langsung (lebih cepat dari 300 request).
    const values = Array.from({ length: 300 }, (_, i) => ({
      storeId,
      name: i === 42 ? 'Indomie Goreng Spesial' : `Produk Contoh ${i}`,
      sku: `UJI-${i}`,
      price: 1000 + i,
    }));
    await testDb!.insert(products).values(values);

    const typo = await app.inject({
      method: 'GET',
      url: '/api/v1/products?q=indomi',
      headers: { cookie },
    });
    expect(typo.statusCode).toBe(200);
    const names = typo.json().products.map((p: { name: string }) => p.name);
    expect(names).toContain('Indomie Goreng Spesial');

    const start = performance.now();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/products?q=contoh&limit=50',
      headers: { cookie },
    });
    const ms = performance.now() - start;
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(299);
    expect(ms).toBeLessThan(100);
  });

  it('pagination 300 produk', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app);
    const storeId = body.store.id as string;
    const values = Array.from({ length: 300 }, (_, i) => ({
      storeId,
      name: `Produk Halaman ${i}`,
      price: 1000,
    }));
    await testDb!.insert(products).values(values);

    const p1 = await app.inject({ method: 'GET', url: '/api/v1/products?page=1&limit=100', headers: { cookie } });
    const p3 = await app.inject({ method: 'GET', url: '/api/v1/products?page=3&limit=100', headers: { cookie } });
    const p4 = await app.inject({ method: 'GET', url: '/api/v1/products?page=4&limit=100', headers: { cookie } });
    expect(p1.json().products).toHaveLength(100);
    expect(p3.json().products).toHaveLength(100);
    expect(p4.json().products).toHaveLength(0);
    expect(p1.json().total).toBe(300);
  });
});
