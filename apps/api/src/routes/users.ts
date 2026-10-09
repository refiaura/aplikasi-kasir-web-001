import { cashierCreateSchema, cashierPermissionsSchema } from '@kasir/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, users } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { hashSecret } from '../lib/password.js';
import { requireOwner } from '../plugins/auth.js';

export async function userRoutes(app: FastifyInstance) {
  /** Daftar pengguna dalam toko sesi (tanpa hash). */
  app.get('/users', { preHandler: requireOwner }, async (req, reply) => {
    const rows = await req.server.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.storeId, req.sessionUser!.storeId))
      .orderBy(users.createdAt);
    return reply.send({ users: rows });
  });

  /** Pemilik membuat akun kasir (login memakai PIN). */
  app.post('/users', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = cashierCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { name, pin, phone, permissions } = parsed.data;

    const pinHash = await hashSecret(pin);
    const [user] = await database
      .insert(users)
      .values({
        storeId,
        name,
        phone: phone ?? null,
        pinHash,
        role: 'cashier',
        permissions: {
          discount: permissions?.discount ?? false,
          void: permissions?.void ?? false,
          reports: permissions?.reports ?? false,
        },
      })
      .returning({
        id: users.id,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
      });
    await database.insert(auditLogs).values({
      storeId,
      userId: req.sessionUser!.userId,
      action: 'user.created',
      payload: { createdUserId: user!.id, role: 'cashier', name },
    });
    return reply.code(201).send({ user });
  });

  /** Ubah hak akses kasir (mis. izin diskon). */
  app.patch('/users/:id/permissions', { preHandler: requireOwner }, async (req, reply) => {
    const parsed = cashierPermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return err.badRequest(reply, parsed.error.issues[0]?.message ?? 'Data tidak valid.');
    }
    const database = req.server.db;
    const storeId = req.sessionUser!.storeId;
    const { id } = req.params as { id: string };

    const [target] = await database
      .select({ id: users.id, role: users.role, permissions: users.permissions })
      .from(users)
      .where(and(eq(users.id, id), eq(users.storeId, storeId)))
      .limit(1);
    if (!target || target.role !== 'cashier') {
      return err.notFound(reply, 'Kasir tidak ditemukan.');
    }
    const merged = { discount: false, void: false, reports: false, ...(target.permissions ?? {}), ...parsed.data };
    await database.update(users).set({ permissions: merged }).where(eq(users.id, id));
    await database.insert(auditLogs).values({
      storeId,
      userId: req.sessionUser!.userId,
      action: 'user.permissions_updated',
      payload: { userId: id, permissions: merged },
    });
    return reply.send({ ok: true, permissions: merged });
  });
}
