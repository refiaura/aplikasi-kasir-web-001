import { resolve } from 'node:path';

export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://kasir:kasir@localhost:5432/kasir',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-secret-ganti-di-production-min-32',
  /** Masa berlaku sesi: 12 jam. */
  sessionTtlMs: 12 * 60 * 60 * 1000,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** Direktori penyimpanan foto produk; selalu absolut (D15 di docs/DECISIONS.md). */
  uploadDir: resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  /** Origin yang diizinkan CORS, dipisah koma. Kosong = CORS mati. */
  corsOrigin: process.env.CORS_ORIGIN ?? '',
} as const;

if (config.nodeEnv === 'production' && config.sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET wajib minimal 32 karakter di production.');
}
