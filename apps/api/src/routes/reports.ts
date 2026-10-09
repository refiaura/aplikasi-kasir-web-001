import { reportQuerySchema, type ReportSummary } from '@kasir/shared';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { payments, products, saleItems, sales, users } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireOwner } from '../plugins/auth.js';

/** Batas rentang tanggal (zona Asia/Jakarta) → timestamp UTC. */
function range(from?: string, to?: string): { fromTs: Date; toTs: Date; fromDate: string; toDate: string } {
  const todayJakarta = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const fromDate = from ?? todayJakarta;
  const toDate = to ?? todayJakarta;
  if (fromDate > toDate) throw new Error('Tanggal awal tidak boleh setelah tanggal akhir.');
  // Awal hari Jakarta = 17:00 UTC hari sebelumnya (WIB = UTC+7).
  const fromTs = new Date(`${fromDate}T00:00:00+07:00`);
  const toTs = new Date(`${toDate}T00:00:00+07:00`);
  toTs.setDate(toTs.getDate() + 1);
  return { fromTs, toTs, fromDate, toDate };
}

function saleFilter(storeId: string, fromTs: Date, toTs: Date) {
  return and(
    eq(sales.storeId, storeId),
    eq(sales.status, 'completed'),
    gte(sales.soldAt, fromTs),
    lte(sales.soldAt, toTs),
  );
}

export async function reportRoutes(app: FastifyInstance) {
  /** Ringkasan: omzet, laba kotor, transaksi, per metode bayar. */
  app.get('/reports/summary', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = reportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    let r: ReturnType<typeof range>;
    try {
      r = range(parsed.data.from, parsed.data.to);
    } catch (e) {
      return err.badRequest(reply, e instanceof Error ? e.message : 'Rentang tanggal tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const filter = saleFilter(storeId, r.fromTs, r.toTs);

    const [agg] = await database
      .select({
        omzet: sql<number>`coalesce(sum(${sales.total}), 0)`,
        labaKotor: sql<number>`coalesce(sum(${sales.total} - ${sales.costTotal} - ${sales.discount}), 0)`,
        transaksi: sql<number>`count(*)`,
      })
      .from(sales)
      .where(filter);

    const byMethod = await database
      .select({
        method: payments.method,
        total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
        transaksi: sql<number>`count(distinct ${payments.saleId})`,
      })
      .from(payments)
      .innerJoin(sales, eq(payments.saleId, sales.id))
      .where(filter)
      .groupBy(payments.method);

    const omzet = Number(agg?.omzet ?? 0);
    const transaksi = Number(agg?.transaksi ?? 0);
    const summary: ReportSummary = {
      from: r.fromDate,
      to: r.toDate,
      omzet,
      labaKotor: Number(agg?.labaKotor ?? 0),
      transaksi,
      rataRata: transaksi > 0 ? Math.round(omzet / transaksi) : 0,
      byMethod: byMethod.map((m) => ({
        method: m.method,
        total: Number(m.total),
        transaksi: Number(m.transaksi),
      })),
    };
    return reply.send({ summary });
  });

  /** Produk terlaris. */
  app.get('/reports/top-products', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = reportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    let r: ReturnType<typeof range>;
    try {
      r = range(parsed.data.from, parsed.data.to);
    } catch (e) {
      return err.badRequest(reply, e instanceof Error ? e.message : 'Rentang tanggal tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const rows = await database
      .select({
        productId: saleItems.productId,
        name: products.name,
        qty: sql<number>`coalesce(sum(${saleItems.qty}::numeric), 0)`,
        omzet: sql<number>`coalesce(sum((${saleItems.qty}::numeric * ${saleItems.unitPrice}) - ${saleItems.discount}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(saleFilter(storeId, r.fromTs, r.toTs))
      .groupBy(saleItems.productId, products.name)
      .orderBy(desc(sql`coalesce(sum((${saleItems.qty}::numeric * ${saleItems.unitPrice}) - ${saleItems.discount}), 0)`))
      .limit(parsed.data.limit ?? 10);
    return reply.send({
      products: rows.map((x) => ({
        productId: x.productId,
        name: x.name,
        qty: Number(x.qty),
        omzet: Number(x.omzet),
      })),
    });
  });

  /** Kinerja per kasir. */
  app.get('/reports/by-cashier', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = reportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    let r: ReturnType<typeof range>;
    try {
      r = range(parsed.data.from, parsed.data.to);
    } catch (e) {
      return err.badRequest(reply, e instanceof Error ? e.message : 'Rentang tanggal tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const rows = await database
      .select({
        cashierId: sales.cashierId,
        name: users.name,
        transaksi: sql<number>`count(*)`,
        omzet: sql<number>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .innerJoin(users, eq(sales.cashierId, users.id))
      .where(saleFilter(storeId, r.fromTs, r.toTs))
      .groupBy(sales.cashierId, users.name)
      .orderBy(desc(sql`coalesce(sum(${sales.total}), 0)`));
    return reply.send({
      cashiers: rows.map((x) => ({
        cashierId: x.cashierId,
        name: x.name,
        transaksi: Number(x.transaksi),
        omzet: Number(x.omzet),
      })),
    });
  });

  /** Omzet harian untuk grafik. */
  app.get('/reports/daily', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = reportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    let r: ReturnType<typeof range>;
    try {
      r = range(parsed.data.from, parsed.data.to);
    } catch (e) {
      return err.badRequest(reply, e instanceof Error ? e.message : 'Rentang tanggal tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const rows = await database
      .select({
        date: sql<string>`(${sales.soldAt} at time zone 'Asia/Jakarta')::date::text`,
        omzet: sql<number>`coalesce(sum(${sales.total}), 0)`,
        transaksi: sql<number>`count(*)`,
      })
      .from(sales)
      .where(saleFilter(storeId, r.fromTs, r.toTs))
      .groupBy(sql`(${sales.soldAt} at time zone 'Asia/Jakarta')::date`)
      .orderBy(sql`(${sales.soldAt} at time zone 'Asia/Jakarta')::date`);
    return reply.send({
      daily: rows.map((x) => ({ date: x.date, omzet: Number(x.omzet), transaksi: Number(x.transaksi) })),
    });
  });
}
