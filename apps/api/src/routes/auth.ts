import { loginSchema, pinLoginSchema, registerSchema } from '@kasir/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, devices, stores, users } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { hashSecret, verifySecret } from '../lib/password.js';
import { lockRemainingMs, recordFailure, resetAttempts } from '../lib/ratelimit.js';
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from '../lib/session.js';
import { requireAuth } from '../plugins/auth.js';

function validationError(reply: Parameters<typeof err.badRequest>[0], e: { issues: { message?: string }[] }) {
  return err.badRequest(reply, e.issues[0]?.message ?? 'Data tidak valid.');
}

export async function authRoutes(app: FastifyInstance) {
  /** Pendaftaran pemilik + toko baru. */
  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const database = req.server.db;
    const { name, storeName, email, password, phone } = parsed.data;

    const existing = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) return err.conflict(reply, 'Email sudah terdaftar.');

    const passwordHash = await hashSecret(password);
    const { store, user } = await database.transaction(async (tx) => {
      const [s] = await tx
        .insert(stores)
        .values({ name: storeName, phone: phone ?? null })
        .returning({ id: stores.id, name: stores.name });
      const [u] = await tx
        .insert(users)
        .values({
          storeId: s!.id,
          name,
          email,
          phone: phone ?? null,
          passwordHash,
          role: 'owner',
          permissions: { discount: true, void: true, reports: true },
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          permissions: users.permissions,
        });
      await tx
        .insert(auditLogs)
        .values({ storeId: s!.id, userId: u!.id, action: 'store.registered', payload: { storeName } });
      return { store: s!, user: u! };
    });

    const sessionId = await createSession(database, user.id, store.id, 'owner');
    setSessionCookie(reply, sessionId);
    return reply.code(201).send({
      user: { id: user.id, storeId: store.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions },
      store: { id: store.id, name: store.name },
    });
  });

  /** Login pemilik via email + kata sandi. */
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const database = req.server.db;
    const { email, password } = parsed.data;

    const key = `login:${email}`;
    const remaining = lockRemainingMs(key);
    if (remaining > 0) return err.tooMany(reply, Math.ceil(remaining / 1000));

    const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);
    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      !(await verifySecret(user.passwordHash, password))
    ) {
      recordFailure(key);
      return err.unauthorized(reply, 'Email atau kata sandi salah.');
    }
    resetAttempts(key);

    const sessionId = await createSession(database, user.id, user.storeId, user.role);
    setSessionCookie(reply, sessionId);
    await database
      .insert(auditLogs)
      .values({ storeId: user.storeId, userId: user.id, action: 'user.login', payload: {} });

    const [store] = await database
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(eq(stores.id, user.storeId))
      .limit(1);
    return reply.send({
      user: { id: user.id, storeId: user.storeId, name: user.name, email: user.email, role: user.role, permissions: user.permissions },
      store,
    });
  });

  /** Login kasir via kode perangkat + PIN 6 digit. */
  app.post('/auth/pin', async (req, reply) => {
    const parsed = pinLoginSchema.safeParse(req.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const database = req.server.db;
    const { deviceCode, pin } = parsed.data;

    const key = `pin:${deviceCode}`;
    const remaining = lockRemainingMs(key);
    if (remaining > 0) return err.tooMany(reply, Math.ceil(remaining / 1000));

    const foundDevices = await database
      .select()
      .from(devices)
      .where(eq(devices.code, deviceCode));
    let matched: { user: (typeof users.$inferSelect); device: (typeof devices.$inferSelect) } | null =
      null;
    for (const device of foundDevices) {
      const cashiers = await database
        .select()
        .from(users)
        .where(
          and(
            eq(users.storeId, device.storeId),
            eq(users.role, 'cashier'),
            eq(users.isActive, true),
          ),
        );
      for (const cashier of cashiers) {
        if (cashier.pinHash && (await verifySecret(cashier.pinHash, pin))) {
          matched = { user: cashier, device };
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) {
      recordFailure(key);
      return err.unauthorized(reply, 'Kode perangkat atau PIN salah.');
    }
    resetAttempts(key);

    await database
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, matched.device.id));

    const sessionId = await createSession(database, matched.user.id, matched.user.storeId, 'cashier');
    setSessionCookie(reply, sessionId);
    await database.insert(auditLogs).values({
      storeId: matched.user.storeId,
      userId: matched.user.id,
      action: 'user.pin_login',
      payload: { deviceCode },
    });

    const [store] = await database
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(eq(stores.id, matched.user.storeId))
      .limit(1);
    return reply.send({
      user: {
        id: matched.user.id,
        storeId: matched.user.storeId,
        name: matched.user.name,
        email: matched.user.email,
        role: matched.user.role,
        permissions: matched.user.permissions,
      },
      store,
    });
  });

  /** Keluar: hapus sesi server-side + cookie. */
  app.post('/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
    const sid = req.cookies[SESSION_COOKIE];
    if (sid) await deleteSession(req.server.db, sid);
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  /** Profil sesi aktif. */
  app.get('/auth/me', { preHandler: requireAuth }, async (req, reply) => {
    const u = req.sessionUser!;
    const [store] = await req.server.db
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(eq(stores.id, u.storeId))
      .limit(1);
    if (!store) return err.notFound(reply, 'Toko tidak ditemukan.');
    return reply.send({
      user: { id: u.userId, storeId: u.storeId, name: u.name, email: u.email, role: u.role, permissions: u.permissions },
      store,
    });
  });
}
