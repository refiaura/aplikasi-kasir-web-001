import {
  saleBatchSchema,
  saleCreateSchema,
  type Sale,
  type SaleCreateInput,
} from '@kasir/shared';
import { and, count, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  auditLogs,
  payments,
  products,
  saleItems,
  sales,
  shifts,
  stockMovements,
  users,
} from '../db/schema.js';
import { err } from '../lib/errors.js';
import { verifySecret } from '../lib/password.js';
import { nextReceiptNo } from '../lib/receipt.js';
import type { SessionData } from '../lib/session.js';
import { requireAuth } from '../plugins/auth.js';

class SaleError extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

/** Kasir wajib login via perangkat (sesi PIN). */
async function requireCashierDevice(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  await requireAuth(req, reply);
  if (reply.sent) return false;
  if (req.sessionUser!.role !== 'cashier' || !req.sessionUser!.deviceId) {
    await err.forbidden(reply, 'Hanya kasir di perangkat terdaftar yang boleh berjualan.');
    return false;
  }
  return true;
}

/** Verifikasi kata sandi salah satu pemilik toko (untuk persetujuan diskon). */
async function verifyOwnerPassword(
  database: FastifyInstance['db'],
  storeId: string,
  password: string,
): Promise<boolean> {
  const owners = await database
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.storeId, storeId), eq(users.role, 'owner'), eq(users.isActive, true)));
  for (const o of owners) {
    if (o.passwordHash && (await verifySecret(o.passwordHash, password))) return true;
  }
  return false;
}

interface ComputedLine {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  lineTotal: number;
  note: string | null;
  trackStock: boolean;
}

interface SaleRow {
  id: string;
  receiptNo: string;
  subtotal: number;
  discount: number;
  total: number;
  cashierName: string | null;
  soldAt: Date;
}

async function saleDto(database: FastifyInstance['db'], row: SaleRow): Promise<Sale> {
  const [itemRows] = await Promise.all([
    database
      .select({
        productId: saleItems.productId,
        name: saleItems.nameSnapshot,
        qty: saleItems.qty,
        unitPrice: saleItems.unitPrice,
        discount: saleItems.discount,
        note: saleItems.note,
      })
      .from(saleItems)
      .where(eq(saleItems.saleId, row.id)),
  ]);
  const [paymentRows] = await Promise.all([
    database
      .select({
        method: payments.method,
        amount: payments.amount,
        cashReceived: payments.cashReceived,
        reference: payments.reference,
      })
      .from(payments)
      .where(eq(payments.saleId, row.id)),
  ]);
  const cashReceivedTotal = paymentRows
    .filter((p) => p.method === 'cash')
    .reduce((s, p) => s + (p.cashReceived ?? 0), 0);
  return {
    id: row.id,
    receiptNo: row.receiptNo,
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    change: Math.max(0, cashReceivedTotal - row.total),
    payments: paymentRows.map((p) => ({
      method: p.method,
      amount: p.amount,
      cashReceived: p.cashReceived,
      reference: p.reference,
    })),
    items: itemRows.map((i) => ({
      productId: i.productId,
      name: i.name,
      qty: Number(i.qty),
      unitPrice: i.unitPrice,
      discount: i.discount,
      note: i.note,
    })),
    cashierName: row.cashierName,
    soldAt: row.soldAt.toISOString(),
  };
}

async function findExistingSale(database: FastifyInstance['db'], clientTxnId: string, storeId: string) {
  const [row] = await database
    .select({
      id: sales.id,
      receiptNo: sales.receiptNo,
      subtotal: sales.subtotal,
      discount: sales.discount,
      total: sales.total,
      cashierName: users.name,
      soldAt: sales.soldAt,
    })
    .from(sales)
    .leftJoin(users, eq(sales.cashierId, users.id))
    .where(and(eq(sales.clientTxnId, clientTxnId), eq(sales.storeId, storeId)))
    .limit(1);
  return row ?? null;
}

/**
 * Buat satu transaksi dalam satu transaksi DB. Idempoten via clientTxnId:
 * bila sudah ada, kembalikan transaksi lama.
 */
async function createSale(
  app: FastifyInstance,
  session: SessionData,
  input: SaleCreateInput,
): Promise<{ sale: Sale; duplicate: boolean }> {
  const database = app.db;
  const { storeId, userId, deviceId } = session;

  const existing = await findExistingSale(database, input.clientTxnId, storeId);
  if (existing) {
    return { sale: await saleDto(database, existing), duplicate: true };
  }

  if (input.payments.some((p) => p.method === 'kasbon')) {
    throw new SaleError(400, 'Pembayaran kasbon tersedia mulai Fase 4.');
  }

  const soldAt = input.soldAt ? new Date(input.soldAt) : new Date();

  const result = await database.transaction(async (tx) => {
    // Shift terbuka di perangkat ini.
    const [shift] = await tx
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.storeId, storeId), eq(shifts.deviceId, deviceId!), isNull(shifts.closedAt)))
      .limit(1);
    if (!shift) throw new SaleError(409, 'Buka shift terlebih dahulu sebelum berjualan.');

    // Muat produk; harga diambil dari server, bukan dari klien.
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const productRows = await tx
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        cost: products.cost,
        trackStock: products.trackStock,
      })
      .from(products)
      .where(and(eq(products.storeId, storeId), eq(products.isActive, true)));
    const byId = new Map(productRows.filter((p) => productIds.includes(p.id)).map((p) => [p.id, p]));

    let subtotal = 0;
    let itemDiscountTotal = 0;
    let costTotal = 0;
    const lines: ComputedLine[] = [];
    for (const item of input.items) {
      const p = byId.get(item.productId);
      if (!p) throw new SaleError(400, `Produk tidak ditemukan atau sudah nonaktif.`);
      const gross = item.qty * p.price;
      const itemDiscount =
        item.discountRp > 0 ? item.discountRp : Math.floor((gross * item.discountPct) / 100);
      if (itemDiscount > gross) throw new SaleError(400, `Diskon "${p.name}" melebihi harga.`);
      subtotal += gross;
      itemDiscountTotal += itemDiscount;
      costTotal += item.qty * p.cost;
      lines.push({
        productId: p.id,
        name: p.name,
        qty: item.qty,
        unitPrice: p.price,
        unitCost: p.cost,
        discount: itemDiscount,
        lineTotal: gross - itemDiscount,
        note: item.note?.trim() ? item.note.trim() : null,
        trackStock: p.trackStock,
      });
    }

    const txnDiscount =
      input.discountRp > 0 ? input.discountRp : Math.floor(((subtotal - itemDiscountTotal) * input.discountPct) / 100);
    const discount = itemDiscountTotal + txnDiscount;
    const total = subtotal - discount;
    if (total < 0) throw new SaleError(400, 'Total belanja tidak valid.');

    // Hak diskon: izin kasir atau persetujuan pemilik (kata sandi).
    if (discount > 0 && !session.permissions.discount) {
      const ok =
        !!input.approvalPassword &&
        (await verifyOwnerPassword(database, storeId, input.approvalPassword));
      if (!ok) throw new SaleError(403, 'Diskon membutuhkan izin atau persetujuan pemilik.');
    }

    const paidTotal = input.payments.reduce((s, p) => s + p.amount, 0);
    if (paidTotal !== total) {
      throw new SaleError(400, 'Total pembayaran harus sama dengan total belanja.');
    }
    if (input.clientTotal !== undefined && input.clientTotal !== total) {
      throw new SaleError(400, 'Total berubah. Muat ulang keranjang lalu coba lagi.');
    }

    const receiptNo = await nextReceiptNo(tx as unknown as FastifyInstance['db'], storeId, soldAt);

    const [sale] = await tx
      .insert(sales)
      .values({
        storeId,
        clientTxnId: input.clientTxnId,
        receiptNo,
        shiftId: shift.id,
        cashierId: userId,
        subtotal,
        discount,
        total,
        costTotal,
        soldAt,
      })
      .returning({
        id: sales.id,
        receiptNo: sales.receiptNo,
        subtotal: sales.subtotal,
        discount: sales.discount,
        total: sales.total,
      });

    await tx.insert(saleItems).values(
      lines.map((l) => ({
        saleId: sale!.id,
        productId: l.productId,
        nameSnapshot: l.name,
        qty: String(l.qty),
        unitPrice: l.unitPrice,
        unitCost: l.unitCost,
        discount: l.discount,
        note: l.note,
      })),
    );

    await tx.insert(payments).values(
      input.payments.map((p) => ({
        saleId: sale!.id,
        method: p.method,
        amount: p.amount,
        cashReceived: p.cashReceived ?? null,
        reference: p.reference?.trim() ? p.reference.trim() : null,
      })),
    );

    // Kurangi stok secara atomik (aman konkurensi); catat mutasi.
    for (const l of lines) {
      if (!l.trackStock) continue;
      const qtyStr = String(l.qty);
      await tx
        .update(products)
        .set({ stockQty: sql`${products.stockQty} - ${qtyStr}` })
        .where(eq(products.id, l.productId));
      await tx.insert(stockMovements).values({
        storeId,
        productId: l.productId,
        type: 'sale',
        qty: `-${qtyStr}`,
        unitCost: l.unitCost,
        refId: sale!.id,
        note: `Penjualan ${receiptNo}`,
        createdBy: userId,
      });
    }

    return { saleId: sale!.id, receiptNo, subtotal, discount, total, lines };
  });

  await database.insert(auditLogs).values({
    storeId,
    userId,
    action: 'sale.created',
    payload: { saleId: result.saleId, receiptNo: result.receiptNo, total: result.total },
  });

  const full = await findExistingSale(database, input.clientTxnId, storeId);
  return { sale: await saleDto(database, full!), duplicate: false };
}

export async function saleRoutes(app: FastifyInstance) {
  /** Buat transaksi (idempoten via clientTxnId). */
  app.post('/sales', async (req, reply) => {
    if (!(await requireCashierDevice(req, reply))) return;
    const parsed = saleCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    try {
      const { sale, duplicate } = await createSale(app, req.sessionUser!, parsed.data);
      return reply.code(duplicate ? 200 : 201).send({ sale, duplicate });
    } catch (e) {
      if (e instanceof SaleError) {
        if (e.status === 400) return err.badRequest(reply, e.message);
        if (e.status === 403) return err.forbidden(reply, e.message);
        if (e.status === 404) return err.notFound(reply, e.message);
        return err.conflict(reply, e.message);
      }
      throw e;
    }
  });

  /** Kirim antrean offline (maks 50); tiap transaksi idempoten. */
  app.post('/sales/batch', async (req, reply) => {
    if (!(await requireCashierDevice(req, reply))) return;
    const parsed = saleBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const results: {
      clientTxnId: string;
      ok: boolean;
      saleId?: string;
      receiptNo?: string;
      duplicate?: boolean;
      error?: string;
    }[] = [];
    for (const item of parsed.data.sales) {
      try {
        const { sale, duplicate } = await createSale(app, req.sessionUser!, item);
        results.push({ clientTxnId: item.clientTxnId, ok: true, saleId: sale.id, receiptNo: sale.receiptNo, duplicate });
      } catch (e) {
        results.push({
          clientTxnId: item.clientTxnId,
          ok: false,
          error: e instanceof SaleError ? e.message : 'Terjadi kesalahan pada server.',
        });
      }
    }
    return reply.send({ results });
  });

  /** Riwayat transaksi: kasir melihat milik perangkatnya, pemilik semua. */
  app.get('/sales', async (req, reply) => {
    await requireAuth(req, reply);
    if (reply.sent) return;
    const database = req.server.db;
    const session = req.sessionUser!;
    const query = req.query as Record<string, string | undefined>;
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '30', 10) || 30));

    const conditions = [eq(sales.storeId, session.storeId)];
    if (session.role === 'cashier') {
      if (!session.deviceId) return err.forbidden(reply, 'Hanya kasir perangkat yang boleh melihat riwayat.');
      const deviceShifts = database
        .select({ id: shifts.id })
        .from(shifts)
        .where(and(eq(shifts.storeId, session.storeId), eq(shifts.deviceId, session.deviceId)));
      conditions.push(sql`${sales.shiftId} IN (${deviceShifts})`);
    }
    if (query.from) conditions.push(gte(sales.soldAt, new Date(query.from)));
    if (query.to) conditions.push(lte(sales.soldAt, new Date(query.to)));

    const [totalRow] = await database
      .select({ total: count() })
      .from(sales)
      .where(and(...conditions));
    const rows = await database
      .select({
        id: sales.id,
        receiptNo: sales.receiptNo,
        subtotal: sales.subtotal,
        discount: sales.discount,
        total: sales.total,
        status: sales.status,
        cashierName: users.name,
        soldAt: sales.soldAt,
      })
      .from(sales)
      .leftJoin(users, eq(sales.cashierId, users.id))
      .where(and(...conditions))
      .orderBy(desc(sales.soldAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return reply.send({
      sales: rows.map((r) => ({
        id: r.id,
        receiptNo: r.receiptNo,
        subtotal: r.subtotal,
        discount: r.discount,
        total: r.total,
        status: r.status,
        cashierName: r.cashierName,
        soldAt: r.soldAt.toISOString(),
      })),
      total: totalRow?.total ?? 0,
      page,
      limit,
    });
  });

  /** Detail transaksi + struk. */
  app.get('/sales/:id', async (req, reply) => {
    await requireAuth(req, reply);
    if (reply.sent) return;
    const database = req.server.db;
    const session = req.sessionUser!;
    const { id } = req.params as { id: string };

    const [row] = await database
      .select({
        id: sales.id,
        receiptNo: sales.receiptNo,
        subtotal: sales.subtotal,
        discount: sales.discount,
        total: sales.total,
        cashierName: users.name,
        soldAt: sales.soldAt,
        shiftId: sales.shiftId,
      })
      .from(sales)
      .leftJoin(users, eq(sales.cashierId, users.id))
      .where(and(eq(sales.id, id), eq(sales.storeId, session.storeId)))
      .limit(1);
    if (!row) return err.notFound(reply, 'Transaksi tidak ditemukan.');

    if (session.role === 'cashier') {
      const [shift] = await database
        .select({ deviceId: shifts.deviceId })
        .from(shifts)
        .where(eq(shifts.id, row.shiftId))
        .limit(1);
      if (!shift || shift.deviceId !== session.deviceId) {
        return err.forbidden(reply, 'Transaksi ini milik perangkat lain.');
      }
    }

    return reply.send({ sale: await saleDto(database, row) });
  });
}
