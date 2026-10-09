import type { SyncDelta } from '@kasir/shared';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { categories, customers, products } from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';

/**
 * Delta katalog untuk cache offline (Fase 5).
 * `since` = ISO timestamp dari respons sebelumnya; kosong = semua data.
 * Konflik edit: server menang (klien menimpa dengan data server).
 */
export async function syncRoutes(app: FastifyInstance) {
  app.get('/sync', { preHandler: requireAuth }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const query = req.query as Record<string, string | undefined>;
    const since = query.since ? new Date(query.since) : null;
    const sinceValid = since && !Number.isNaN(since.getTime()) ? since : null;
    const now = new Date();

    const productRows = await database
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        cost: products.cost,
        unit: products.unit,
        categoryId: products.categoryId,
        isActive: products.isActive,
        trackStock: products.trackStock,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(
        sinceValid
          ? and(eq(products.storeId, storeId), gt(products.updatedAt, sinceValid))
          : eq(products.storeId, storeId),
      )
      .limit(5000);

    const categoryRows = await database
      .select({ id: categories.id, name: categories.name, updatedAt: categories.updatedAt })
      .from(categories)
      .where(
        sinceValid
          ? and(eq(categories.storeId, storeId), gt(categories.updatedAt, sinceValid))
          : eq(categories.storeId, storeId),
      );

    const customerRows = await database
      .select({ id: customers.id, name: customers.name, phone: customers.phone, updatedAt: customers.updatedAt })
      .from(customers)
      .where(
        sinceValid
          ? and(eq(customers.storeId, storeId), gt(customers.updatedAt, sinceValid))
          : eq(customers.storeId, storeId),
      );

    const delta: SyncDelta = {
      now: now.toISOString(),
      products: productRows.map((p) => ({
        ...p,
        price: Number(p.price),
        cost: Number(p.cost),
        updatedAt: p.updatedAt.toISOString(),
      })),
      categories: categoryRows.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })),
      customers: customerRows.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })),
    };
    return reply.send(delta);
  });
}
