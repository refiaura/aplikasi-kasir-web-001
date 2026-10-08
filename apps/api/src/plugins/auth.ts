import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from '../db/index.js';
import { SESSION_COOKIE, getSession, type SessionData } from '../lib/session.js';
import { err } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
  interface FastifyRequest {
    sessionUser: SessionData | null;
  }
}

/**
 * Middleware isolasi tenant: setiap request terotentikasi membawa
 * `sessionUser` berisi storeId DARI SESI — bukan dari body/query.
 * Seluruh query bisnis wajib memfilter dengan storeId ini.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const sid = req.cookies[SESSION_COOKIE];
  if (!sid) {
    await err.unauthorized(reply);
    return;
  }
  const session = await getSession(req.server.db, sid);
  if (!session) {
    await err.unauthorized(reply, 'Sesi kedaluwarsa. Silakan masuk kembali.');
    return;
  }
  req.sessionUser = session;
}

/** Hanya untuk pemilik toko. */
export async function requireOwner(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (req.sessionUser?.role !== 'owner') {
    await err.forbidden(reply, 'Hanya pemilik toko yang boleh melakukan tindakan ini.');
  }
}
