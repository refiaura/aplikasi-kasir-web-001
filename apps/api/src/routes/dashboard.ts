import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { stores } from '../db/schema.js';
import { err } from '../lib/errors.js';
import { requireAuth } from '../plugins/auth.js';

export async function dashboardRoutes(app: FastifyInstance) {
  /**
   * Ringkasan dashboard. Fase 1: struktur final, angka nol
   * (angka asli diisi di Fase 4 — lihat D7 di docs/DECISIONS.md).
   */
  app.get('/dashboard/summary', { preHandler: requireAuth }, async (req, reply) => {
    const [store] = await req.server.db
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(eq(stores.id, req.sessionUser!.storeId))
      .limit(1);
    if (!store) return err.notFound(reply, 'Toko tidak ditemukan.');
    return reply.send({
      store,
      today: { omzet: 0, labaKotor: 0, transaksi: 0, kasbonAktif: 0 },
      stokMenipis: [],
      stokMinus: [],
    });
  });
}
