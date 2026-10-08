import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, registerOwner } from './helpers.js';

/**
 * Wajib PRD: setiap tabel bisnis punya store_id dan setiap query difilter
 * dengan store_id DARI SESI, bukan dari body request.
 */
describe('isolasi tenant', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  afterEach(async () => {
    await app?.close();
  });

  it('toko B tidak bisa melihat perangkat toko A', async () => {
    app = await buildTestApp();
    const a = await registerOwner(app, { email: 'iso-a@toko.id', storeName: 'Toko A' });
    const b = await registerOwner(app, { email: 'iso-b@toko.id', storeName: 'Toko B' });

    await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { cookie: a.cookie },
      payload: { code: 'KASIR-01', name: 'Tablet A' },
    });

    const listB = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { cookie: b.cookie },
    });
    expect(listB.statusCode).toBe(200);
    expect(listB.json().devices).toHaveLength(0);

    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { cookie: a.cookie },
    });
    expect(listA.json().devices).toHaveLength(1);
  });

  it('store_id di body diabaikan: perangkat selalu masuk toko milik sesi', async () => {
    app = await buildTestApp();
    const a = await registerOwner(app, { email: 'iso2-a@toko.id', storeName: 'Toko A' });
    const b = await registerOwner(app, { email: 'iso2-b@toko.id', storeName: 'Toko B' });

    // Upaya memalsukan store_id lewat body (dua varian penamaan).
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { cookie: a.cookie },
      payload: { code: 'KASIR-99', name: 'Tablet Jahat', store_id: b.body.store.id, storeId: b.body.store.id },
    });
    expect(res.statusCode).toBe(201);

    const listB = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { cookie: b.cookie },
    });
    expect(listB.json().devices).toHaveLength(0);

    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { cookie: a.cookie },
    });
    expect(listA.json().devices.map((d: { code: string }) => d.code)).toContain('KASIR-99');
  });

  it('kasir tidak bisa mengakses endpoint khusus pemilik (403)', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app, { email: 'iso3@toko.id' });
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
      payload: { name: 'Kasir', pin: '654321' },
    });
    const pin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin',
      payload: { deviceCode: 'KASIR-01', pin: '654321' },
    });
    const cashierCookie = String(pin.headers['set-cookie']).split(';')[0];

    for (const [method, url] of [
      ['GET', '/api/v1/devices'],
      ['POST', '/api/v1/devices'],
      ['GET', '/api/v1/users'],
      ['POST', '/api/v1/users'],
    ] as const) {
      const r = await app.inject({ method, url, headers: { cookie: cashierCookie }, payload: {} });
      expect(r.statusCode).toBe(403);
    }
  });

  it('PIN kasir toko A tidak berlaku di perangkat toko B', async () => {
    app = await buildTestApp();
    const a = await registerOwner(app, { email: 'iso4-a@toko.id', storeName: 'Toko A' });
    const b = await registerOwner(app, { email: 'iso4-b@toko.id', storeName: 'Toko B' });

    // Perangkat milik toko B.
    await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { cookie: b.cookie },
      payload: { code: 'KASIR-B1', name: 'Tablet B' },
    });
    // Kasir + PIN milik toko A.
    await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { cookie: a.cookie },
      payload: { name: 'Kasir A', pin: '111111' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin',
      payload: { deviceCode: 'KASIR-B1', pin: '111111' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('tanpa sesi → 401 di endpoint terproteksi', async () => {
    app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/devices' });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('BELUM_MASUK');
  });
});
