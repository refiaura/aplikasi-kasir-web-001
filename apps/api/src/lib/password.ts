import argon2 from 'argon2';

/** Hash Argon2id untuk kata sandi dan PIN. */
export async function hashSecret(plain: string): Promise<string> {
  return argon2.hash(plain);
}

/** Verifikasi; gagal (termasuk hash korup) dianggap tidak cocok. */
export async function verifySecret(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
