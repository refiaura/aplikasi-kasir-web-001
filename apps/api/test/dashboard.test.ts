import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, registerOwner } from './helpers.js';

describe('dashboard Fase 1', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  afterEach(async () => {
    await app?.close();
  });

  it('summary mengembalikan struktur kosong milik toko sesi', async () => {
    app = await buildTestApp();
    const { cookie, body } = await registerOwner(app, { storeName: 'Toko Maju' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/summary',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.store.name).toBe('Toko Maju');
    expect(json.store.id).toBe(body.store.id);
    expect(json.today).toEqual({ omzet: 0, labaKotor: 0, transaksi: 0, kasbonAktif: 0 });
    expect(json.stokMenipis).toEqual([]);
    expect(json.stokMinus).toEqual([]);
  });
});
