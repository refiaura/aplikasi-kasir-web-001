import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { buildTestApp, registerOwner, sessionCookie } from './helpers.js';

function multipartPayload(boundary: string, filename: string, mimetype: string, content: Buffer) {
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, content, tail]);
}

describe('upload foto produk', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app?.close();
  });

  it('upload webp → 201 + url yang bisa diakses', async () => {
    app = await buildTestApp();
    const { res, cookie } = await registerOwner(app);
    expect(sessionCookie(res)).toMatch(/^sid=/);

    const boundary = '----uji-batas';
    // Header WebP asli (RIFF....WEBP); isi bebas untuk test.
    const fakeWebp = Buffer.concat([Buffer.from('RIFF____WEBP'), Buffer.alloc(100)]);
    const upload = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: {
        cookie,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartPayload(boundary, 'foto.webp', 'image/webp', fakeWebp),
    });
    expect(upload.statusCode).toBe(201);
    const { url } = upload.json() as { url: string };
    expect(url).toMatch(/^\/uploads\/.+\.webp$/);
    expect(existsSync(join(config.uploadDir, url.split('/').pop()!))).toBe(true);

    const get = await app.inject({ method: 'GET', url, headers: { cookie } });
    expect(get.statusCode).toBe(200);
  });

  it('file bukan gambar ditolak', async () => {
    app = await buildTestApp();
    const { cookie } = await registerOwner(app);
    const boundary = '----uji-batas';
    const upload = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: {
        cookie,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartPayload(boundary, 'data.pdf', 'application/pdf', Buffer.from('pdf')),
    });
    expect(upload.statusCode).toBe(400);
  });

  it('tanpa login → 401', async () => {
    app = await buildTestApp();
    const boundary = '----uji-batas';
    const upload = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: multipartPayload(boundary, 'foto.webp', 'image/webp', Buffer.from('x')),
    });
    expect(upload.statusCode).toBe(401);
  });
});
