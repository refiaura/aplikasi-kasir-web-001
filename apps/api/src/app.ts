import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { config } from './config.js';
import { db, type Db } from './db/index.js';
import { err } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { categoryRoutes } from './routes/categories.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { deviceRoutes } from './routes/devices.js';
import { productRoutes } from './routes/products.js';
import { stockRoutes } from './routes/stock.js';
import { uploadRoutes } from './routes/uploads.js';
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
  app.register(multipart, { limits: { fileSize: 3 * 1024 * 1024, files: 1 } });

  // Foto produk diserve statis dari direktori upload.
  mkdirSync(config.uploadDir, { recursive: true });
  app.register(fastifyStatic, { root: config.uploadDir, prefix: '/uploads/' });

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
      await api.register(categoryRoutes);
      await api.register(productRoutes);
      await api.register(stockRoutes);
      await api.register(uploadRoutes);
      await api.register(dashboardRoutes);
    },
    { prefix: '/api/v1' },
  );

  app.get('/health', async () => ({ ok: true }));

  return app;
}
