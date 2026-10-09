import { cashMovementInputSchema, shiftCloseSchema, shiftOpenSchema, type Shift } from '@kasir/shared';
import { and, desc, eq, isNull, sql, sum } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { auditLogs, cashMovements, devices, payments, sales, shifts, users } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireAuth, requireOwner } from '../plugins/auth.js';

/** Kasir wajib login via perangkat (sesi PIN). */
async function requireCashierDevice(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  await requireAuth(req, reply);
  if (reply.sent) return false;
  if (req.sessionUser!.role !== 'cashier' || !req.sessionUser!.deviceId) {
    await err.forbidden(reply, 'Hanya kasir di perangkat terdaftar yang boleh membuka shift.');
    return false;
  }
  return true;
}

interface ShiftRow {
  id: string;
  deviceId: string;
  deviceName: string | null;
  openedByName: string | null;
  openingCash: number;
  expectedCash: number | null;
  countedCash: number | null;
  openedAt: Date;
  closedAt: Date | null;
}

async function shiftAggregates(database: FastifyInstance['db'], shiftId: string) {
  const [cash] = await database
    .select({ total: sum(payments.amount) })
    .from(payments)
    .innerJoin(sales, eq(payments.saleId, sales.id))
    .where(and(eq(sales.shiftId, shiftId), eq(payments.method, 'cash')));
  const [ci] = await database
    .select({ total: sum(cashMovements.amount) })
    .from(cashMovements)
    .where(and(eq(cashMovements.shiftId, shiftId), sql`${cashMovements.amount} > 0`));
  const [co] = await database
    .select({ total: sum(cashMovements.amount) })
    .from(cashMovements)
    .where(and(eq(cashMovements.shiftId, shiftId), sql`${cashMovements.amount} < 0`));
  return {
    cashSales: Number(cash?.total ?? 0),
    cashIn: Number(ci?.total ?? 0),
    cashOut: Math.abs(Number(co?.total ?? 0)),
  };
}

async function toDto(database: FastifyInstance['db'], row: ShiftRow): Promise<Shift> {
  const agg = await shiftAggregates(database, row.id);
  const expected = row.closedAt
    ? (row.expectedCash ?? 0)
    : row.openingCash + agg.cashSales + agg.cashIn - agg.cashOut;
  return {
    id: row.id,
    deviceId: row.deviceId,
    deviceName: row.deviceName,
    openedByName: row.openedByName,
    openingCash: row.openingCash,
    expectedCash: expected,
    countedCash: row.countedCash,
    variance: row.countedCash !== null ? row.countedCash - expected : null,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    cashIn: agg.cashIn,
    cashOut: agg.cashOut,
    cashSales: agg.cashSales,
  };
}

async function openShiftForDevice(database: FastifyInstance['db'], storeId: string, deviceId: string) {
  const [row] = await database
    .select({
      id: shifts.id,
      deviceId: shifts.deviceId,
      deviceName: devices.name,
      openedByName: users.name,
      openingCash: shifts.openingCash,
      expectedCash: shifts.expectedCash,
      countedCash: shifts.countedCash,
      openedAt: shifts.openedAt,
      closedAt: shifts.closedAt,
    })
    .from(shifts)
    .leftJoin(devices, eq(shifts.deviceId, devices.id))
    .leftJoin(users, eq(shifts.openedBy, users.id))
    .where(and(eq(shifts.storeId, storeId), eq(shifts.deviceId, deviceId), isNull(shifts.closedAt)))
    .limit(1);
  return row ?? null;
}

export async function shiftRoutes(app: FastifyInstance) {
  /** Buka shift di perangkat sesi. */
  app.post('/shifts/open', async (req, reply) => {
    if (!(await requireCashierDevice(req, reply))) return;
    const parsed = shiftOpenSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const { storeId, userId, deviceId } = req.sessionUser!;

    const existing = await openShiftForDevice(database, storeId, deviceId!);
    if (existing) return err.conflict(reply, 'Perangkat ini masih punya shift terbuka.');

    const [row] = await database
      .insert(shifts)
      .values({ storeId, deviceId: deviceId!, openedBy: userId, openingCash: parsed.data.openingCash })
      .returning({
        id: shifts.id,
        deviceId: shifts.deviceId,
        openingCash: shifts.openingCash,
        expectedCash: shifts.expectedCash,
        countedCash: shifts.countedCash,
        openedAt: shifts.openedAt,
        closedAt: shifts.closedAt,
      });
    await database.insert(auditLogs).values({
      storeId,
      userId,
      action: 'shift.opened',
      payload: { shiftId: row!.id, deviceId, openingCash: parsed.data.openingCash },
    });
    const full = await openShiftForDevice(database, storeId, deviceId!);
    return reply.code(201).send({ shift: await toDto(database, full!) });
  });

  /** Shift yang sedang terbuka di perangkat sesi. */
  app.get('/shifts/current', async (req, reply) => {
    if (!(await requireCashierDevice(req, reply))) return;
    const database = req.server.db;
    const { storeId, deviceId } = req.sessionUser!;
    const row = await openShiftForDevice(database, storeId, deviceId!);
    if (!row) return reply.send({ shift: null });
    return reply.send({ shift: await toDto(database, row) });
  });

  /** Kas masuk/keluar di tengah shift. */
  app.post('/shifts/:id/cash-movements', async (req, reply) => {
    if (!(await requireCashierDevice(req, reply))) return;
    const parsed = cashMovementInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const { storeId, userId, deviceId } = req.sessionUser!;
    const { id } = req.params as { id: string };

    const row = await openShiftForDevice(database, storeId, deviceId!);
    if (!row || row.id !== id) return err.notFound(reply, 'Shift terbuka tidak ditemukan.');

    await database.insert(cashMovements).values({
      shiftId: id,
      amount: parsed.data.amount,
      note: parsed.data.note,
      createdBy: userId,
    });
    await database.insert(auditLogs).values({
      storeId,
      userId,
      action: 'shift.cash_movement',
      payload: { shiftId: id, amount: parsed.data.amount, note: parsed.data.note },
    });
    const updated = await openShiftForDevice(database, storeId, deviceId!);
    return reply.code(201).send({ shift: await toDto(database, updated!) });
  });

  /** Tutup shift: hitung kas yang diharapkan vs kas fisik. */
  app.post('/shifts/:id/close', async (req, reply) => {
    if (!(await requireCashierDevice(req, reply))) return;
    const parsed = shiftCloseSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const { storeId, userId, deviceId } = req.sessionUser!;
    const { id } = req.params as { id: string };

    const row = await openShiftForDevice(database, storeId, deviceId!);
    if (!row || row.id !== id) return err.notFound(reply, 'Shift terbuka tidak ditemukan.');

    const agg = await shiftAggregates(database, id);
    const expected = row.openingCash + agg.cashSales + agg.cashIn - agg.cashOut;

    await database
      .update(shifts)
      .set({ expectedCash: expected, countedCash: parsed.data.countedCash, closedBy: userId, closedAt: new Date() })
      .where(eq(shifts.id, id));
    await database.insert(auditLogs).values({
      storeId,
      userId,
      action: 'shift.closed',
      payload: { shiftId: id, expectedCash: expected, countedCash: parsed.data.countedCash },
    });

    const [closed] = await database
      .select({
        id: shifts.id,
        deviceId: shifts.deviceId,
        deviceName: devices.name,
        openedByName: users.name,
        openingCash: shifts.openingCash,
        expectedCash: shifts.expectedCash,
        countedCash: shifts.countedCash,
        openedAt: shifts.openedAt,
        closedAt: shifts.closedAt,
      })
      .from(shifts)
      .leftJoin(devices, eq(shifts.deviceId, devices.id))
      .leftJoin(users, eq(shifts.openedBy, users.id))
      .where(eq(shifts.id, id))
      .limit(1);
    return reply.send({ shift: await toDto(database, closed!) });
  });

  /** Riwayat shift (pemilik). */
  app.get('/shifts', { preHandler: requireOwner }, async (req, reply) => {
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const query = req.query as Record<string, string | undefined>;
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? '30', 10) || 30));

    const rows = await database
      .select({
        id: shifts.id,
        deviceId: shifts.deviceId,
        deviceName: devices.name,
        openedByName: users.name,
        openingCash: shifts.openingCash,
        expectedCash: shifts.expectedCash,
        countedCash: shifts.countedCash,
        openedAt: shifts.openedAt,
        closedAt: shifts.closedAt,
      })
      .from(shifts)
      .leftJoin(devices, eq(shifts.deviceId, devices.id))
      .leftJoin(users, eq(shifts.openedBy, users.id))
      .where(eq(shifts.storeId, storeId))
      .orderBy(desc(shifts.openedAt))
      .limit(limit);

    const result: Shift[] = [];
    for (const r of rows) result.push(await toDto(database, r));
    return reply.send({ shifts: result });
  });
}
