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
