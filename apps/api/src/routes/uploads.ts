import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { err } from '../lib/errors.js';
import { requireOwner } from '../plugins/auth.js';

const ALLOWED: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** Upload foto produk (klien wajib mengompres ke WebP dulu bila bisa). */
export async function uploadRoutes(app: FastifyInstance) {
  app.post('/uploads', { preHandler: requireOwner }, async (req, reply) => {
    const file = await req.file();
    if (!file) return err.badRequest(reply, 'File tidak ditemukan.');

    const ext = ALLOWED[file.mimetype];
    if (!ext) {
      return err.badRequest(reply, 'Format gambar harus WebP, PNG, atau JPEG.');
    }

    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(config.uploadDir, filename);
    try {
      await pipeline(file.file, createWriteStream(filepath));
    } catch {
      return err.server(reply);
    }
    return reply.code(201).send({ url: `/uploads/${filename}` });
  });
}
