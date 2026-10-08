import type { FastifyReply } from 'fastify';

/** Kirim error JSON baku { code, message, details? } berbahasa Indonesia. */
export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return reply.code(status).send(details === undefined ? { code, message } : { code, message, details });
}

export const err = {
  badRequest: (r: FastifyReply, m: string, d?: unknown) =>
    sendError(r, 400, 'PERMINTAAN_TIDAK_VALID', m, d),
  unauthorized: (r: FastifyReply, m = 'Silakan masuk terlebih dahulu.') =>
    sendError(r, 401, 'BELUM_MASUK', m),
  forbidden: (r: FastifyReply, m = 'Anda tidak punya akses untuk tindakan ini.') =>
    sendError(r, 403, 'AKSES_DITOLAK', m),
  notFound: (r: FastifyReply, m = 'Data tidak ditemukan.') =>
    sendError(r, 404, 'TIDAK_DITEMUKAN', m),
  conflict: (r: FastifyReply, m: string) => sendError(r, 409, 'KONFLIK', m),
  tooMany: (r: FastifyReply, retryAfterSec: number) =>
    sendError(r, 429, 'TERLALU_BANYAK_PERCOBAAN', 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.', {
      retryAfterSec,
    }),
  server: (r: FastifyReply) =>
    sendError(r, 500, 'KESALAHAN_SERVER', 'Terjadi kesalahan pada server.'),
};
