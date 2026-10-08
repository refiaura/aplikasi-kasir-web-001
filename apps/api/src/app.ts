import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { config } from './config.js';
import { db, type Db } from './db/index.js';
import { err } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { deviceRoutes } from './routes/devices.js';
import { userRoutes } from './routes/users.js';

export interface BuildAppOptions {
  db?: Db;
  logger?: boolean;
}

export function buildApp(opts?: BuildAppOptions) {
  const app = Fastify({
    logger: opts?.logger ?? (config.nodeEnv === 'production' ? { level: 'info' } : false),
  });

  // Koneksi DB per instance (bisa di-override saat test).
  app.decorate('db', opts?.db ?? db);

  app.register(cookie);

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    return err.server(reply);
  });

  app.setNotFoundHandler((_req, reply) => err.notFound(reply, 'Alamat tidak ditemukan.'));

  app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(userRoutes);
      await api.register(deviceRoutes);
      await api.register(dashboardRoutes);
    },
    { prefix: '/api/v1' },
  );

  app.get('/health', async () => ({ ok: true }));

  return app;
}
