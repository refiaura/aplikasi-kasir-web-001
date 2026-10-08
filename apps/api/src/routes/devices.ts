import { deviceCreateSchema } from '@kasir/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, devices } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireOwner } from '../plugins/auth.js';

export async function deviceRoutes(app: FastifyInstance) {
  /** Daftar perangkat — selalu milik toko dari SESI. */
  app.get('/devices', { preHandler: requireOwner }, async (req, reply) => {
    const rows = await req.server.db
      .select({
        id: devices.id,
        code: devices.code,
        name: devices.name,
        lastSeenAt: devices.lastSeenAt,
      })
      .from(devices)
      .where(eq(devices.storeId, req.sessionUser!.storeId))
      .orderBy(devices.createdAt);
    return reply.send({ devices: rows });
  });

  /** Registrasi perangkat. store_id SELALU dari sesi; body tidak boleh menentukannya. */
  app.post('/devices', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = deviceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { code, name } = parsed.data;

    const existing = await database
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.storeId, storeId), eq(devices.code, code)))
      .limit(1);
    if (existing.length > 0) return err.conflict(reply, 'Kode perangkat sudah terdaftar.');

    const [device] = await database
      .insert(devices)
      .values({ storeId, code, name })
      .returning({ id: devices.id, code: devices.code, name: devices.name, lastSeenAt: devices.lastSeenAt });
    await database.insert(auditLogs).values({
      storeId,
      userId: req.sessionUser!.userId,
      action: 'device.registered',
      payload: { deviceId: device!.id, code },
    });
    return reply.code(201).send({ device });
  });
}
