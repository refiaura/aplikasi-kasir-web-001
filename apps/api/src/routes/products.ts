import {
  productCreateSchema,
  productSeedSchema,
  productUpdateSchema,
  type Product,
} from '@kasir/shared';
import { and, count, eq, getTableColumns, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, categories, products, stockMovements } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireAuth, requireOwner } from '../plugins/auth.js';
import { PRODUCT_SEEDS } from '../seed/products.js';

type ProductRow = typeof products.$inferSelect & { categoryName: string | null };

const num = (v: string | number | null): number => Number(v ?? 0);

function toDto(p: ProductRow): Product {
  const stockQty = num(p.stockQty);
  const minStock = num(p.minStock);
  return {
    id: p.id,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    unit: p.unit,
    price: p.price,
    cost: p.cost,
    trackStock: p.trackStock,
    stockQty,
    minStock,
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    lowStock: p.trackStock && stockQty <= minStock,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findProduct(database: FastifyInstance['db'], storeId: string, id: string) {
  const [row] = await database
    .select({ ...getTableColumns(products), categoryName: categories.name })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.id, id), eq(products.storeId, storeId)))
    .limit(1);
  return row ?? null;
}

export async function productRoutes(app: FastifyInstance) {
  /** Daftar produk: cari trigram (?q=), filter kategori, stok menipis, pagination. */
  app.get('/products', { preHandler: requireAuth }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const query = req.query as Record<string, string | undefined>;
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '50', 10) || 50));
    const q = query.q?.trim() || undefined;
    const categoryId = query.category_id || undefined;
    const lowStockOnly = query.low_stock === '1';

    if (categoryId && !UUID_RE.test(categoryId)) {
      return err.badRequest(reply, 'ID kategori tidak valid.');
    }

    const conditions = [eq(products.storeId, storeId), eq(products.isActive, true)];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (lowStockOnly) {
      conditions.push(eq(products.trackStock, true));
      conditions.push(sql`${products.stockQty} <= ${products.minStock}`);
    }
    if (q) {
      // Pencarian trigram (pg_trgm) + fallback ILIKE untuk awalan/singkatan.
      conditions.push(sql`(${products.name} % ${q} OR ${products.name} ILIKE ${`%${q}%`})`);
    }

    const orderBy = q
      ? sql`similarity(${products.name}, ${q}) DESC, ${products.name} ASC`
      : products.name;

    const [totalRow] = await database
      .select({ total: count() })
      .from(products)
      .where(and(...conditions));
    const rows = await database
      .select({ ...getTableColumns(products), categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    return reply.send({
      products: rows.map(toDto),
      total: totalRow?.total ?? 0,
      page,
      limit,
    });
  });

  /** Detail produk (termasuk yang nonaktif, untuk dialog ubah). */
  app.get('/products/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await findProduct(req.server.db, req.sessionUser!.storeId, id);
    if (!row) return err.notFound(reply, 'Produk tidak ditemukan.');
    return reply.send({ product: toDto(row) });
  });

  /** Buat produk. Stok awal dicatat sebagai mutasi pembelian. */
  app.post('/products', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = productCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const userId = req.sessionUser!.userId;
    const data = parsed.data;
    const sku = data.sku?.trim() ? data.sku.trim() : null;
    const barcode = data.barcode?.trim() ? data.barcode.trim() : null;

    if (data.categoryId) {
      const [cat] = await database
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, data.categoryId), eq(categories.storeId, storeId)))
        .limit(1);
      if (!cat) return err.badRequest(reply, 'Kategori tidak ditemukan.');
    }
    for (const [field, value, label] of [
      ['sku', sku, 'SKU'],
      ['barcode', barcode, 'Barcode'],
    ] as const) {
      if (!value) continue;
      const [clash] = await database
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products[field], value)))
        .limit(1);
      if (clash) return err.conflict(reply, `${label} sudah dipakai produk lain.`);
    }

    const product = await database.transaction(async (tx) => {
      const [p] = await tx
        .insert(products)
        .values({
          storeId,
          categoryId: data.categoryId ?? null,
          name: data.name,
          sku,
          barcode,
          unit: data.unit,
          price: data.price,
          cost: data.cost,
          trackStock: data.trackStock,
          stockQty: String(data.initialStock),
          minStock: String(data.minStock),
          imageUrl: data.imageUrl ?? null,
        })
        .returning();
      if (data.initialStock > 0) {
        await tx.insert(stockMovements).values({
          storeId,
          productId: p!.id,
          type: 'purchase',
          qty: String(data.initialStock),
          unitCost: data.cost,
          note: 'Stok awal',
          createdBy: userId,
        });
      }
      return p!;
    });

    await database.insert(auditLogs).values({
      storeId,
      userId,
      action: 'product.created',
      payload: { productId: product.id, name: product.name },
    });

    const row = await findProduct(database, storeId, product.id);
    return reply.code(201).send({ product: toDto(row!) });
  });

  /** Ubah produk (stok diubah lewat /stock/movements). */
  app.patch('/products/:id', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };
    const data = parsed.data;

    const current = await findProduct(database, storeId, id);
    if (!current) return err.notFound(reply, 'Produk tidak ditemukan.');

    if (data.categoryId) {
      const [cat] = await database
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, data.categoryId), eq(categories.storeId, storeId)))
        .limit(1);
      if (!cat) return err.badRequest(reply, 'Kategori tidak ditemukan.');
    }
    for (const [field, value, label] of [
      ['sku', data.sku, 'SKU'],
      ['barcode', data.barcode, 'Barcode'],
    ] as const) {
      const normalized = value?.trim() ? value.trim() : null;
      if (normalized === null || normalized === current[field]) continue;
      const [clash] = await database
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products[field], normalized)))
        .limit(1);
      if (clash && clash.id !== id) return err.conflict(reply, `${label} sudah dipakai produk lain.`);
    }

    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.categoryId !== undefined) patch.categoryId = data.categoryId;
    if (data.sku !== undefined) patch.sku = data.sku?.trim() ? data.sku.trim() : null;
    if (data.barcode !== undefined) patch.barcode = data.barcode?.trim() ? data.barcode.trim() : null;
    if (data.unit !== undefined) patch.unit = data.unit;
    if (data.price !== undefined) patch.price = data.price;
    if (data.cost !== undefined) patch.cost = data.cost;
    if (data.trackStock !== undefined) patch.trackStock = data.trackStock;
    if (data.minStock !== undefined) patch.minStock = String(data.minStock);
    if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
    if (data.isActive !== undefined) patch.isActive = data.isActive;

    if (Object.keys(patch).length > 0) {
      await database.update(products).set(patch).where(eq(products.id, id));
      await database.insert(auditLogs).values({
        storeId,
        userId: req.sessionUser!.userId,
        action: 'product.updated',
        payload: { productId: id, patch: Object.keys(patch) },
      });
    }

    const row = await findProduct(database, storeId, id);
    return reply.send({ product: toDto(row!) });
  });

  /** Nonaktifkan produk (soft delete agar riwayat tetap utuh). */
  app.delete('/products/:id', { preHandler: requireOwner }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };

    const current = await findProduct(database, storeId, id);
    if (!current) return err.notFound(reply, 'Produk tidak ditemukan.');

    await database.update(products).set({ isActive: false }).where(eq(products.id, id));
    await database.insert(auditLogs).values({
      storeId,
      userId: req.sessionUser!.userId,
      action: 'product.deactivated',
      payload: { productId: id, name: current.name },
    });
    return reply.send({ ok: true });
  });

  /** Isi contoh produk sesuai jenis usaha (hanya untuk toko yang belum punya produk). */
  app.post('/products/seed', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = productSeedSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const userId = req.sessionUser!.userId;

    const [existing] = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.storeId, storeId))
      .limit(1);
    if (existing) {
      return err.conflict(reply, 'Toko sudah memiliki produk. Contoh hanya untuk toko baru.');
    }

    const seed = PRODUCT_SEEDS[parsed.data.businessType];
    const result = await database.transaction(async (tx) => {
      const catIds = new Map<string, string>();
      for (const c of seed.categories) {
        const [row] = await tx
          .insert(categories)
          .values({ storeId, name: c.name, sortOrder: c.sortOrder })
          .returning({ id: categories.id });
        catIds.set(c.name, row!.id);
      }
      let productCount = 0;
      for (const p of seed.products) {
        const [prod] = await tx
          .insert(products)
          .values({
            storeId,
            categoryId: catIds.get(p.category) ?? null,
            name: p.name,
            sku: p.sku,
            unit: p.unit,
            price: p.price,
            cost: p.cost,
            trackStock: p.trackStock,
            stockQty: String(p.stockQty),
            minStock: String(p.minStock),
          })
          .returning({ id: products.id });
        if (p.stockQty > 0) {
          await tx.insert(stockMovements).values({
            storeId,
            productId: prod!.id,
            type: 'purchase',
            qty: String(p.stockQty),
            unitCost: p.cost,
            note: 'Stok awal (contoh)',
            createdBy: userId,
          });
        }
        productCount += 1;
      }
      return { categories: seed.categories.length, products: productCount };
    });

    await database.insert(auditLogs).values({
      storeId,
      userId,
      action: 'product.seeded',
      payload: { businessType: parsed.data.businessType, ...result },
    });
    return reply.code(201).send(result);
  });
}
