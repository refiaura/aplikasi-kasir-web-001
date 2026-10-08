/**
 * Rate limit sederhana in-memory: 5 kali gagal → kunci 5 menit.
 * Catatan: per instance; pindahkan ke Redis/tabel DB untuk multi-instance (D2).
 */
export const MAX_FAILS = 5;
export const LOCK_MS = 5 * 60 * 1000;

interface Attempt {
  fails: number;
  lockedUntil: number;
}

const attempts = new Map<string, Attempt>();

function get(key: string): Attempt {
  let a = attempts.get(key);
  if (!a) {
    a = { fails: 0, lockedUntil: 0 };
    attempts.set(key, a);
  }
  return a;
}

/** Sisa waktu kunci dalam ms; 0 bila tidak dikunci. */
export function lockRemainingMs(key: string): number {
  const a = attempts.get(key);
  if (!a || a.lockedUntil === 0) return 0;
  const remaining = a.lockedUntil - Date.now();
  if (remaining <= 0) {
    // Kunci kedaluwarsa: hapus agar hitungan gagal mulai dari nol lagi.
    attempts.delete(key);
    return 0;
  }
  return remaining;
}

export function recordFailure(key: string): void {
  const a = get(key);
  a.fails += 1;
  if (a.fails >= MAX_FAILS) {
    a.lockedUntil = Date.now() + LOCK_MS;
    a.fails = 0;
  }
}

export function resetAttempts(key: string): void {
  attempts.delete(key);
}

/** Untuk test: bersihkan seluruh state. */
export function clearAllAttempts(): void {
  attempts.clear();
}
