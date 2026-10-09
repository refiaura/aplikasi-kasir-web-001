import { ApiRequestError } from './api';

const BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Kompres gambar di klien ke WebP (maks 800px, kualitas 0.8) sesuai PRD.
 * Mengembalikan Blob WebP siap upload.
 */
export async function compressToWebP(file: File, maxDim = 800, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Kanvs tidak didukung peramban ini.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    if (!blob) throw new Error('Gagal mengompres gambar.');
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Upload Blob gambar ke POST /uploads; mengembalikan URL publik. */
export async function uploadImage(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'foto.webp');
  const res = await fetch(`${BASE}/api/v1/uploads`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      code: 'KESALAHAN_JARINGAN',
      message: 'Tidak dapat mengunggah gambar.',
    }))) as { code: string; message: string };
    throw new ApiRequestError(res.status, body);
  }
  const { url } = (await res.json()) as { url: string };
  return `${BASE}${url}`;
}
