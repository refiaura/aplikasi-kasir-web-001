import { categoryCreateSchema, categoryUpdateSchema } from '@kasir/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, categories, products } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireOwner } from '../plugins/auth.js';

const selectCols = {
  id: categories.id,
  name: categories.name,
  sortOrder: categories.sortOrder,
};

export async function categoryRoutes(app: FastifyInstance) {
  /** Daftar kategori milik toko sesi. */
  app.get('/categories', { preHandler: requireOwner }, async (req, reply) => {
    const rows = await req.server.db
      .select(selectCols)
      .from(categories)
      .where(eq(categories.storeId, req.sessionUser!.storeId))
      .orderBy(categories.sortOrder, categories.name);
    return reply.send({ categories: rows });
  });

  app.post('/categories', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = categoryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { name, sortOrder } = parsed.data;

    const existing = await database
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.storeId, storeId), eq(categories.name, name)))
      .limit(1);
    if (existing.length > 0) return err.conflict(reply, 'Nama kategori sudah dipakai.');

    const [category] = await database
      .insert(categories)
      .values({ storeId, name, sortOrder: sortOrder ?? 0 })
      .returning(selectCols);
    await database.insert(auditLogs).values({
      storeId,
      userId: req.sessionUser!.userId,
      action: 'category.created',
      payload: { categoryId: category!.id, name },
    });
    return reply.code(201).send({ category });
  });

  app.patch('/categories/:id', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = categoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };

    const [current] = await database
      .select(selectCols)
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .limit(1);
    if (!current) return err.notFound(reply, 'Kategori tidak ditemukan.');

    if (parsed.data.name && parsed.data.name !== current.name) {
      const clash = await database
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.storeId, storeId), eq(categories.name, parsed.data.name)))
        .limit(1);
      if (clash.length > 0) return err.conflict(reply, 'Nama kategori sudah dipakai.');
    }

    const [updated] = await database
      .update(categories)
      .set({ ...(parsed.data.name ? { name: parsed.data.name } : {}), ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}), updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .returning(selectCols);
    return reply.send({ category: updated });
  });

  app.delete('/categories/:id', { preHandler: requireOwner }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };

    const [current] = await database
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.storeId, storeId)))
      .limit(1);
    if (!current) return err.notFound(reply, 'Kategori tidak ditemukan.');

    const used = await database
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.categoryId, id), eq(products.storeId, storeId)))
      .limit(1);
    if (used.length > 0) {
      return err.conflict(reply, 'Kategori masih dipakai produk. Pindahkan dulu produknya.');
    }

    await database.delete(categories).where(and(eq(categories.id, id), eq(categories.storeId, storeId)));
    await database.insert(auditLogs).values({
      storeId,
      userId: req.sessionUser!.userId,
      action: 'category.deleted',
      payload: { categoryId: id },
    });
    return reply.send({ ok: true });
  });
}
