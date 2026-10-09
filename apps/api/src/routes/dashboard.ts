import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { customers, products, sales, stores } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireAuth } from '../plugins/auth.js';

/** Awal & akhir hari ini dalam zona Asia/Jakarta → timestamp UTC. */
function todayRange(): { fromTs: Date; toTs: Date } {
  const jakarta = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const fromTs = new Date(`${jakarta}T00:00:00+07:00`);
  const toTs = new Date(fromTs);
  toTs.setDate(toTs.getDate() + 1);
  return { fromTs, toTs };
}

export async function dashboardRoutes(app: FastifyInstance) {
  /** Ringkasan dashboard: angka hari ini + grafik 7 hari + peringatan stok. */
  app.get('/dashboard/summary', { preHandler: requireAuth }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const [store] = await database
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    if (!store) return err.notFound(reply, 'Toko tidak ditemukan.');

    const { fromTs, toTs } = todayRange();
    const todayFilter = and(
      eq(sales.storeId, storeId),
      eq(sales.status, 'completed'),
      gte(sales.soldAt, fromTs),
      lte(sales.soldAt, toTs),
    );

    const [today] = await database
      .select({
        omzet: sql<number>`coalesce(sum(${sales.total}), 0)`,
        labaKotor: sql<number>`coalesce(sum(${sales.total} - ${sales.costTotal} - ${sales.discount}), 0)`,
        transaksi: sql<number>`count(*)`,
      })
      .from(sales)
      .where(todayFilter);

    // 7 hari terakhir (zona Jakarta).
    const weekAgo = new Date(fromTs);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const daily = await database
      .select({
        date: sql<string>`(${sales.soldAt} at time zone 'Asia/Jakarta')::date::text`,
        omzet: sql<number>`coalesce(sum(${sales.total}), 0)`,
        transaksi: sql<number>`count(*)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.storeId, storeId),
          eq(sales.status, 'completed'),
          gte(sales.soldAt, weekAgo),
          lte(sales.soldAt, toTs),
        ),
      )
      .groupBy(sql`(${sales.soldAt} at time zone 'Asia/Jakarta')::date`)
      .orderBy(sql`(${sales.soldAt} at time zone 'Asia/Jakarta')::date`);

    const [kasbonAktif] = await database
      .select({ total: sql<number>`count(*)` })
      .from(customers)
      .where(and(eq(customers.storeId, storeId), sql`${customers.kasbonBalance} > 0`));

    const menipis = await database
      .select({ id: products.id, name: products.name, stockQty: products.stockQty, unit: products.unit })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.isActive, true),
          eq(products.trackStock, true),
          sql`${products.stockQty} <= ${products.minStock}`,
          sql`${products.stockQty} >= 0`,
        ),
      )
      .limit(10);

    const minus = await database
      .select({ id: products.id, name: products.name, stockQty: products.stockQty, unit: products.unit })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.isActive, true),
          eq(products.trackStock, true),
          sql`${products.stockQty} < 0`,
        ),
      )
      .limit(10);

    return reply.send({
      store,
      today: {
        omzet: Number(today?.omzet ?? 0),
        labaKotor: Number(today?.labaKotor ?? 0),
        transaksi: Number(today?.transaksi ?? 0),
        kasbonAktif: Number(kasbonAktif?.total ?? 0),
      },
      weekly: daily.map((d) => ({
        date: d.date,
        omzet: Number(d.omzet),
        transaksi: Number(d.transaksi),
      })),
      stokMenipis: menipis.map((p) => ({ ...p, stockQty: Number(p.stockQty) })),
      stokMinus: minus.map((p) => ({ ...p, stockQty: Number(p.stockQty) })),
    });
  });
}
