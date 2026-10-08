import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, registerOwner } from './helpers.js';

describe('auth pemilik', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  afterEach(async () => {
    await app?.close();
  });

  it('register → cookie sesi → /auth/me', async () => {
    app = await buildTestApp();
    const { res, cookie, body } = await registerOwner(app);
    expect(res.statusCode).toBe(201);
    expect(cookie).toMatch(/^sid=/);
    expect(body.user.role).toBe('owner');
    expect(body.store.name).toBe('Toko Berkah');

    const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(body.user.email);
  });

  it('register email duplikat → 409 berbahasa Indonesia', async () => {
    app = await buildTestApp();
    const first = await registerOwner(app, { email: 'sama@toko.id' });
    expect(first.res.statusCode).toBe(201);
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Lain', storeName: 'Toko Lain', email: 'sama@toko.id', password: 'rahasia123' },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().message).toBe('Email sudah terdaftar.');
  });

  it('register password pendek → 400 dengan pesan Indonesia', async () => {
    app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Pemilik', storeName: 'Toko', email: 'x@toko.id', password: 'pendek' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Kata sandi minimal 8 karakter.');
  });

  it('login benar → 200 + cookie; login salah → 401', async () => {
    app = await buildTestApp();
    const { body } = await registerOwner(app);
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: body.user.email, password: 'rahasia123' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['set-cookie']).toBeDefined();

    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: body.user.email, password: 'salah-salah' },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().message).toBe('Email atau kata sandi salah.');
  });

  it('5x login gagal → percobaan ke-6 dikunci 429', async () => {
    app = await buildTestApp();
    const { body } = await registerOwner(app);
    for (let i = 0; i < 5; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: body.user.email, password: 'salah' },
      });
      expect(r.statusCode).toBe(401);
    }
    const locked = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: body.user.email, password: 'salah' },
    });
    expect(locked.statusCode).toBe(429);
    expect(locked.json().code).toBe('TERLALU_BANYAK_PERCOBAAN');
  });

  it('logout menghapus sesi: /auth/me sesudahnya → 401', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const out = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie },
    });
    expect(out.statusCode).toBe(200);
    const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });
});

describe('auth kasir (PIN + perangkat)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  afterEach(async () => {
    await app?.close();
  });

  async function siapkanKasir() {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const d = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { cookie },
      payload: { code: 'KASIR-01', name: 'Tablet Kasir' },
    });
    expect(d.statusCode).toBe(201);
    const u = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { cookie },
      payload: { name: 'Kasir Satu', pin: '123456' },
    });
    expect(u.statusCode).toBe(201);
    return { cookie };
  }

  it('PIN benar di perangkat terdaftar → 200 sebagai kasir', async () => {
    await siapkanKasir();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin',
      payload: { deviceCode: 'KASIR-01', pin: '123456' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('cashier');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('PIN salah 5x → percobaan ke-6 dikunci 429', async () => {
    await siapkanKasir();
    for (let i = 0; i < 5; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/pin',
        payload: { deviceCode: 'KASIR-01', pin: '000000' },
      });
      expect(r.statusCode).toBe(401);
    }
    const locked = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin',
      payload: { deviceCode: 'KASIR-01', pin: '000000' },
    });
    expect(locked.statusCode).toBe(429);
    expect(locked.json().message).toContain('Terlalu banyak percobaan');
  });

  it('PIN di perangkat yang tidak terdaftar → 401', async () => {
    await siapkanKasir();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/pin',
      payload: { deviceCode: 'TIDAK-ADA', pin: '123456' },
    });
    expect(res.statusCode).toBe(401);
  });
});
