import {
  customerInputSchema,
  kasbonPaymentSchema,
  type Customer,
  type KasbonEntry,
} from '@kasir/shared';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, customers, kasbonEntries, sales } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireAuth, requireOwner } from '../plugins/auth.js';

function toCustomerDto(r: typeof customers.$inferSelect): Customer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    kasbonBalance: r.kasbonBalance,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function customerRoutes(app: FastifyInstance) {
  /** Daftar pelanggan (kasir & pemilik). */
  app.get('/customers', { preHandler: requireAuth }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const query = req.query as Record<string, string | undefined>;
    const q = (query.q ?? '').trim();
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '30', 10) || 30));

    const conditions = [eq(customers.storeId, storeId)];
    if (q) conditions.push(ilike(customers.name, `%${q}%`));
    // Filter yang punya kasbon saja
    if (query.hasKasbon === 'true') conditions.push(sql`${customers.kasbonBalance} > 0`);

    const rows = await database
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.updatedAt))
      .limit(limit);
    return reply.send({ customers: rows.map(toCustomerDto) });
  });

  /** Tambah pelanggan. */
  app.post('/customers', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = customerInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const [row] = await database
      .insert(customers)
      .values({ storeId, name: parsed.data.name, phone: parsed.data.phone?.trim() || null })
      .returning();
    await database.insert(auditLogs).values({
      storeId,
      userId: req.sessionUser!.userId,
      action: 'customer.created',
      payload: { customerId: row!.id, name: row!.name },
    });
    return reply.code(201).send({ customer: toCustomerDto(row!) });
  });

  /** Detail pelanggan. */
  app.get('/customers/:id', { preHandler: requireAuth }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };
    const [row] = await database
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.storeId, storeId)))
      .limit(1);
    if (!row) return err.notFound(reply, 'Pelanggan tidak ditemukan.');
    return reply.send({ customer: toCustomerDto(row) });
  });

  /** Ubah pelanggan (pemilik). */
  app.patch('/customers/:id', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = customerInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };
    const [row] = await database
      .update(customers)
      .set({ name: parsed.data.name, phone: parsed.data.phone?.trim() || null, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.storeId, storeId)))
      .returning();
    if (!row) return err.notFound(reply, 'Pelanggan tidak ditemukan.');
    return reply.send({ customer: toCustomerDto(row) });
  });

  /** Riwayat kasbon pelanggan. */
  app.get('/customers/:id/kasbon', { preHandler: requireAuth }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };
    const [customer] = await database
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.storeId, storeId)))
      .limit(1);
    if (!customer) return err.notFound(reply, 'Pelanggan tidak ditemukan.');

    const rows = await database
      .select({
        id: kasbonEntries.id,
        customerId: kasbonEntries.customerId,
        saleId: kasbonEntries.saleId,
        receiptNo: sales.receiptNo,
        amount: kasbonEntries.amount,
        note: kasbonEntries.note,
        createdAt: kasbonEntries.createdAt,
      })
      .from(kasbonEntries)
      .leftJoin(sales, eq(kasbonEntries.saleId, sales.id))
      .where(eq(kasbonEntries.customerId, id))
      .orderBy(desc(kasbonEntries.createdAt))
      .limit(100);
    const entries: KasbonEntry[] = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
    return reply.send({ entries });
  });

  /** Bayar kasbon (boleh sebagian, tidak boleh melebihi saldo). */
  app.post('/customers/:id/kasbon-payments', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = kasbonPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const { storeId, userId } = req.sessionUser!;
    const { id } = req.params as { id: string };

    const result = await database.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, id), eq(customers.storeId, storeId)))
        .limit(1);
      if (!customer) throw new Error('NOT_FOUND');
      if (parsed.data.amount > customer.kasbonBalance) {
        throw new Error('OVERPAY');
      }
      const [entry] = await tx
        .insert(kasbonEntries)
        .values({
          storeId,
          customerId: id,
          amount: -parsed.data.amount,
          note: parsed.data.note?.trim()
            ? `${parsed.data.note.trim()} (${parsed.data.method}${parsed.data.reference ? ` ${parsed.data.reference}` : ''})`
            : `Bayar kasbon (${parsed.data.method})`,
        })
        .returning();
      const [updated] = await tx
        .update(customers)
        .set({
          kasbonBalance: sql`${customers.kasbonBalance} - ${parsed.data.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id))
        .returning();
      return { entry: entry!, customer: updated! };
    }).catch((e: Error) => {
      if (e.message === 'NOT_FOUND') return null;
      if (e.message === 'OVERPAY') return 'OVERPAY' as const;
      throw e;
    });

    if (result === null) return err.notFound(reply, 'Pelanggan tidak ditemukan.');
    if (result === 'OVERPAY') {
      return err.badRequest(reply, 'Nominal melebihi sisa kasbon.');
    }
    await database.insert(auditLogs).values({
      storeId,
      userId,
      action: 'kasbon.paid',
      payload: { customerId: id, amount: parsed.data.amount, method: parsed.data.method },
    });
    return reply.code(201).send({
      entry: { ...result.entry, createdAt: result.entry.createdAt.toISOString() },
      customer: toCustomerDto(result.customer),
    });
  });
}
