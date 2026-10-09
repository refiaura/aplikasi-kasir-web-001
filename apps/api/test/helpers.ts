import type { FastifyInstance } from 'fastify';
import type { MeResponse } from '@kasir/shared';
import { buildApp } from '../src/app.js';
import { testDb } from './setup.js';

export async function buildTestApp(): Promise<FastifyInstance> {
  if (!testDb) throw new Error('DATABASE_URL wajib diisi untuk test yang memakai database.');
  const app = buildApp({ db: testDb, logger: false });
  await app.ready();
  return app;
}

/** Ambil nilai cookie sesi dari header set-cookie (tanpa dependensi tipe tambahan). */
export function sessionCookie(res: unknown): string {
  const headers = (res as { headers?: Record<string, unknown> }).headers ?? {};
  const setCookie = headers['set-cookie'];
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return String(first ?? '').split(';')[0] ?? '';
}

interface OwnerOverrides {
  name?: string;
  storeName?: string;
  email?: string;
  password?: string;
}

let counter = 0;

export async function registerOwner(app: FastifyInstance, overrides: OwnerOverrides = {}) {
  counter += 1;
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      name: 'Pemilik Toko',
      storeName: 'Toko Berkah',
      email: `owner${counter}@toko.id`,
      password: 'rahasia123',
      ...overrides,
    },
  });
  return { res, cookie: sessionCookie(res), body: res.json() as MeResponse };
}

interface CashierSetup {
  cookie: string;
  ownerCookie: string;
  storeId: string;
  deviceId: string;
  shiftId: string;
  userId: string;
}

/**
 * Siapkan kasir lengkap: perangkat + akun kasir + login PIN + buka shift.
 * Kembalikan cookie kasir dan info shift.
 */
export async function setupCashier(
  app: FastifyInstance,
  opts: { pin?: string; permissions?: Record<string, boolean>; openingCash?: number; ownerEmail?: string } = {},
): Promise<CashierSetup> {
  const { cookie: ownerCookie, body } = await registerOwner(app, opts.ownerEmail ? { email: opts.ownerEmail } : {});
  const storeId = (body as unknown as { store: { id: string } }).store.id;
  const pin = opts.pin ?? '123456';

  const deviceCode = `KASIR-${counter}`;
  const deviceRes = await app.inject({
    method: 'POST',
    url: '/api/v1/devices',
    headers: { cookie: ownerCookie },
    payload: { code: deviceCode, name: 'Tablet Kasir' },
  });
  const deviceId = (deviceRes.json().device as { id: string }).id;

  const userRes = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: { cookie: ownerCookie },
    payload: { name: 'Kasir Satu', pin, permissions: opts.permissions ?? {} },
  });
  const userId = (userRes.json().user as { id: string }).id;

  const pinRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/pin',
    payload: { deviceCode, pin },
  });
  const cookie = sessionCookie(pinRes);

  const shiftRes = await app.inject({
    method: 'POST',
    url: '/api/v1/shifts/open',
    headers: { cookie },
    payload: { openingCash: opts.openingCash ?? 100000 },
  });
  if (shiftRes.statusCode !== 201) {
    throw new Error(`Gagal buka shift di test: ${shiftRes.statusCode} ${shiftRes.body}`);
  }
  const shiftId = (shiftRes.json().shift as { id: string }).id;
  return { cookie, ownerCookie, storeId, deviceId, shiftId, userId };
}
