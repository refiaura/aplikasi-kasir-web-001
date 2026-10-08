import { and, eq, gt } from 'drizzle-orm';
import type { FastifyReply } from 'fastify';
import { config } from '../config.js';
import { db as defaultDb, type Db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';

export const SESSION_COOKIE = 'sid';

export interface SessionData {
  sessionId: string;
  userId: string;
  storeId: string;
  name: string;
  email: string | null;
  role: 'owner' | 'cashier';
  permissions: Record<string, boolean>;
}

export async function createSession(
  database: Db,
  userId: string,
  storeId: string,
  role: 'owner' | 'cashier',
): Promise<string> {
  const expiresAt = new Date(Date.now() + config.sessionTtlMs);
  const [row] = await database
    .insert(sessions)
    .values({ userId, storeId, role, expiresAt })
    .returning({ id: sessions.id });
  if (!row) throw new Error('Gagal membuat sesi.');
  return row.id;
}

export async function getSession(
  database: Db,
  sessionId: string,
): Promise<SessionData | null> {
  const [row] = await database
    .select({
      sessionId: sessions.id,
      userId: users.id,
      storeId: users.storeId,
      name: users.name,
      email: users.email,
      role: users.role,
      permissions: users.permissions,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.isActive) return null;
  return {
    sessionId: row.sessionId,
    userId: row.userId,
    storeId: row.storeId,
    name: row.name,
    email: row.email,
    role: row.role,
    permissions: row.permissions ?? {},
  };
}

export async function deleteSession(database: Db, sessionId: string): Promise<void> {
  await database.delete(sessions).where(eq(sessions.id, sessionId));
}

export function setSessionCookie(reply: FastifyReply, sessionId: string): void {
  reply.setCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Varian default memakai koneksi global (untuk hook auth). */
export const getDefaultSession = (sessionId: string) => getSession(defaultDb, sessionId);
