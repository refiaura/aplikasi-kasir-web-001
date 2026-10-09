import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, registerOwner, setupCashier } from './helpers.js';

describe('shift kasir', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('buka shift, tolak shift ganda, baca shift berjalan', async () => {
    app = await buildTestApp();
    const { cookie } = await setupCashier(app);

    const ganda = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: { cookie },
      payload: { openingCash: 50000 },
    });
    expect(ganda.statusCode).toBe(409);

    const current = await app.inject({
      method: 'GET',
      url: '/api/v1/shifts/current',
      headers: { cookie },
    });
    expect(current.statusCode).toBe(200);
    expect(current.json().shift.openingCash).toBe(100000);
    expect(current.json().shift.closedAt).toBeNull();
  });

  it('pemilik tanpa perangkat tidak bisa buka shift', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: { cookie },
      payload: { openingCash: 100000 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('kas masuk/keluar tercatat dan agregat benar', async () => {
    app = await buildTestApp();
    const { cookie, shiftId } = await setupCashier(app);

    await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${shiftId}/cash-movements`,
      headers: { cookie },
      payload: { amount: 50000, note: 'Modal tambahan' },
    });
    const keluar = await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${shiftId}/cash-movements`,
      headers: { cookie },
      payload: { amount: -20000, note: 'Beli plastik' },
    });
    expect(keluar.statusCode).toBe(201);
    const shift = keluar.json().shift;
    expect(shift.cashIn).toBe(50000);
    expect(shift.cashOut).toBe(20000);
    // expected = 100000 + 0 + 50000 - 20000
    expect(shift.expectedCash).toBe(130000);
  });

  it('tutup shift menghitung selisih', async () => {
    app = await buildTestApp();
    const { cookie, shiftId } = await setupCashier(app, { openingCash: 100000 });

    const tutup = await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${shiftId}/close`,
      headers: { cookie },
      payload: { countedCash: 95000, note: 'Tutup toko' },
    });
    expect(tutup.statusCode).toBe(200);
    const shift = tutup.json().shift;
    expect(shift.expectedCash).toBe(100000);
    expect(shift.countedCash).toBe(95000);
    expect(shift.variance).toBe(-5000);
    expect(shift.closedAt).not.toBeNull();

    // Shift sudah tutup → current null, dan bisa buka shift baru
    const current = await app.inject({
      method: 'GET',
      url: '/api/v1/shifts/current',
      headers: { cookie },
    });
    expect(current.json().shift).toBeNull();
    const baru = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts/open',
      headers: { cookie },
      payload: { openingCash: 95000 },
    });
    expect(baru.statusCode).toBe(201);
  });

  it('pemilik melihat riwayat shift tokonya saja', async () => {
    app = await buildTestApp();
    const a = await setupCashier(app, { ownerEmail: 'sh-a@toko.id' });
    await setupCashier(app, { ownerEmail: 'sh-b@toko.id' });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/shifts',
      headers: { cookie: a.ownerCookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().shifts).toHaveLength(1);
    expect(list.json().shifts[0].deviceId).toBe(a.deviceId);
  });
});
