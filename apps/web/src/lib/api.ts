import type { ApiError } from '@kasir/shared';

const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiRequestError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

/** Klien API: cookie sesi selalu ikut (credentials: include). */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      code: 'KESALAHAN_JARINGAN',
      message: 'Tidak dapat menghubungi server.',
    }))) as ApiError;
    throw new ApiRequestError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const get = <T>(path: string) => api<T>(path, { method: 'GET' });
