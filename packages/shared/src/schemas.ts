import { z } from 'zod';

/** Pendaftaran pemilik + toko baru. */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(100),
  storeName: z.string().trim().min(2, 'Nama toko minimal 2 karakter.').max(120),
  email: z.string().trim().toLowerCase().email('Email tidak valid.').max(160),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(128),
  phone: z.string().trim().max(20, 'Nomor telepon maksimal 20 karakter.').optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Login pemilik via email + kata sandi. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Login kasir via kode perangkat + PIN 6 digit. */
export const pinLoginSchema = z.object({
  deviceCode: z.string().trim().min(1, 'Kode perangkat wajib diisi.').max(32),
  pin: z.string().regex(/^\d{6}$/, 'PIN harus 6 digit angka.'),
});
export type PinLoginInput = z.infer<typeof pinLoginSchema>;

/** Registrasi perangkat kasir oleh pemilik. */
export const deviceCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kode perangkat minimal 2 karakter.')
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'Kode perangkat hanya boleh huruf, angka, - dan _.'),
  name: z.string().trim().min(2, 'Nama perangkat minimal 2 karakter.').max(100),
});
export type DeviceCreateInput = z.infer<typeof deviceCreateSchema>;

/** Pembuatan akun kasir oleh pemilik (login memakai PIN). */
export const cashierCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(100),
  pin: z.string().regex(/^\d{6}$/, 'PIN harus 6 digit angka.'),
  phone: z.string().trim().max(20, 'Nomor telepon maksimal 20 karakter.').optional(),
});
export type CashierCreateInput = z.infer<typeof cashierCreateSchema>;

export const userRoleSchema = z.enum(['owner', 'cashier']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Format error baku API: { code, message, details? } berbahasa Indonesia. */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
