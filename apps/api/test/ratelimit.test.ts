import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOCK_MS,
  MAX_FAILS,
  clearAllAttempts,
  lockRemainingMs,
  recordFailure,
  resetAttempts,
} from '../src/lib/ratelimit.js';

describe('rate limit login/PIN', () => {
  beforeEach(() => clearAllAttempts());

  it('tidak dikunci sebelum 5 kali gagal', () => {
    for (let i = 0; i < MAX_FAILS - 1; i++) recordFailure('kunci-a');
    expect(lockRemainingMs('kunci-a')).toBe(0);
  });

  it('dikunci 5 menit setelah 5 kali gagal', () => {
    for (let i = 0; i < MAX_FAILS; i++) recordFailure('kunci-b');
    const remaining = lockRemainingMs('kunci-b');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(LOCK_MS);
  });

  it('resetAttempts membuka kunci', () => {
    for (let i = 0; i < MAX_FAILS; i++) recordFailure('kunci-c');
    expect(lockRemainingMs('kunci-c')).toBeGreaterThan(0);
    resetAttempts('kunci-c');
    expect(lockRemainingMs('kunci-c')).toBe(0);
  });

  it('kunci antar identifier terpisah', () => {
    for (let i = 0; i < MAX_FAILS; i++) recordFailure('user-1');
    expect(lockRemainingMs('user-1')).toBeGreaterThan(0);
    expect(lockRemainingMs('user-2')).toBe(0);
  });

  it('pola pakai route: cek lalu catat gagal, berulang → terkunci', () => {
    const key = 'pola-rute';
    for (let i = 0; i < MAX_FAILS; i++) {
      expect(lockRemainingMs(key)).toBe(0);
      recordFailure(key);
    }
    expect(lockRemainingMs(key)).toBeGreaterThan(0);
    expect(lockRemainingMs(key)).toBeLessThanOrEqual(LOCK_MS);
  });
});
