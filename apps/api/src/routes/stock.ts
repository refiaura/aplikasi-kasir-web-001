import { stockMovementSchema } from '@kasir/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, products, stockMovements, users } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireAuth, requireOwner } from '../plugins/auth.js';

export async function stockRoutes(app: FastifyInstance) {
  /**
   * Mutasi stok manual: stok masuk (purchase) atau penyesuaian/opname (adjustment).
   * Selalu dalam satu transaksi: catat mutasi + perbarui products.stock_qty.
   */
  app.post('/stock/movements', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = stockMovementSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const userId = req.sessionUser!.userId;
    const { productId, type, qty, unitCost, note } = parsed.data;

    const [product] = await database
      .select({ id: products.id, name: products.name, trackStock: products.trackStock })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId), eq(products.isActive, true)))
      .limit(1);
    if (!product) return err.notFound(reply, 'Produk tidak ditemukan.');
    if (!product.trackStock) {
      return err.badRequest(reply, 'Produk ini tidak melacak stok.');
    }

    const qtyStr = String(qty);
    const movement = await database.transaction(async (tx) => {
      const [mv] = await tx
        .insert(stockMovements)
        .values({
          storeId,
          productId,
          type,
          qty: qtyStr,
          unitCost: type === 'purchase' ? (unitCost ?? null) : null,
          note: note?.trim() ? note.trim() : null,
          createdBy: userId,
        })
        .returning({
          id: stockMovements.id,
          type: stockMovements.type,
          qty: stockMovements.qty,
          unitCost: stockMovements.unitCost,
          note: stockMovements.note,
          createdAt: stockMovements.createdAt,
        });
      // Harga modal mengikuti pembelian terakhir (D13).
      const patch: Record<string, unknown> = {
        stockQty: sql`${products.stockQty} + ${qtyStr}`,
      };
      if (type === 'purchase' && unitCost !== undefined) patch.cost = unitCost;
      await tx.update(products).set(patch).where(eq(products.id, productId));
      return mv!;
    });

    await database.insert(auditLogs).values({
      storeId,
      userId,
      action: 'stock.movement',
      payload: { productId, productName: product.name, type, qty },
    });

    return reply.code(201).send({
      movement: {
        id: movement.id,
        productId,
        productName: product.name,
        type: movement.type,
        qty: Number(movement.qty),
        unitCost: movement.unitCost,
        note: movement.note,
        createdAt: movement.createdAt,
      },
    });
  });

  /** Riwayat mutasi stok (filter per produk opsional). */
  app.get('/stock/movements', { preHandler: requireAuth }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const query = req.query as Record<string, string | undefined>;
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '50', 10) || 50));
    const productId = query.product_id || undefined;

    const conditions = [eq(stockMovements.storeId, storeId)];
    if (productId) conditions.push(eq(stockMovements.productId, productId));

    const rows = await database
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        type: stockMovements.type,
        qty: stockMovements.qty,
        unitCost: stockMovements.unitCost,
        note: stockMovements.note,
        createdByName: users.name,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);

    return reply.send({
      movements: rows.map((r) => ({
        ...r,
        qty: Number(r.qty),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });
}
