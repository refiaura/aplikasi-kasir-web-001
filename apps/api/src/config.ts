export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://kasir:kasir@localhost:5432/kasir',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-secret-ganti-di-production-min-32',
  /** Masa berlaku sesi: 12 jam. */
  sessionTtlMs: 12 * 60 * 60 * 1000,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;

if (config.nodeEnv === 'production' && config.sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET wajib minimal 32 karakter di production.');
}
