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

/* ------------------------------------------------------------------ */
/* Fase 2 — Kategori, produk, stok                                      */
/* ------------------------------------------------------------------ */

/** Buat kategori. */
export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter.').max(60),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

/** Ubah kategori. */
export const categoryUpdateSchema = categoryCreateSchema.partial();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

const rupiahSchema = z
  .number({ invalid_type_error: 'Harga harus berupa angka.' })
  .int('Harga harus bilangan bulat rupiah.')
  .min(0, 'Harga tidak boleh negatif.')
  .max(9_007_199_254_740_991, 'Harga terlalu besar.');

const qtySchema = z
  .number({ invalid_type_error: 'Jumlah harus berupa angka.' })
  .min(0, 'Jumlah tidak boleh negatif.')
  .max(999_999_999, 'Jumlah terlalu besar.');

/** Buat produk. Stok awal (bila > 0) dicatat sebagai mutasi pembelian "Stok awal". */
export const productCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama produk minimal 2 karakter.').max(120),
  categoryId: z.string().uuid('Kategori tidak valid.').nullable().optional(),
  sku: z.string().trim().max(40).nullable().optional(),
  barcode: z.string().trim().max(40).nullable().optional(),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  price: rupiahSchema,
  cost: rupiahSchema.optional().default(0),
  trackStock: z.boolean().optional().default(true),
  initialStock: qtySchema.optional().default(0),
  minStock: qtySchema.optional().default(0),
  imageUrl: z.string().trim().max(500).nullable().optional(),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

/** Ubah produk (semua opsional; stok diubah lewat /stock/movements). */
export const productUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Nama produk minimal 2 karakter.').max(120).optional(),
  categoryId: z.string().uuid('Kategori tidak valid.').nullable().optional(),
  sku: z.string().trim().max(40).nullable().optional(),
  barcode: z.string().trim().max(40).nullable().optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  price: rupiahSchema.optional(),
  cost: rupiahSchema.optional(),
  trackStock: z.boolean().optional(),
  minStock: qtySchema.optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const stockMoveTypeSchema = z.enum(['purchase', 'adjustment']);
export type StockMoveType = z.infer<typeof stockMoveTypeSchema>;

/**
 * Mutasi stok manual.
 * - purchase: stok masuk (qty positif), unitCost = harga modal per satuan.
 * - adjustment: penyesuaian/opname (qty boleh negatif), note (alasan) wajib.
 */
export const stockMovementSchema = z
  .object({
    productId: z.string().uuid('Produk tidak valid.'),
    type: stockMoveTypeSchema,
    qty: z
      .number({ invalid_type_error: 'Jumlah harus berupa angka.' })
      .refine((v) => v !== 0, 'Jumlah tidak boleh nol.')
      .refine((v) => Math.abs(v) <= 999_999_999, 'Jumlah terlalu besar.'),
    unitCost: rupiahSchema.optional(),
    note: z.string().trim().max(280).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'purchase' && v.qty < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Stok masuk harus bernilai positif.', path: ['qty'] });
    }
    if (v.type === 'adjustment' && !v.note) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Alasan penyesuaian wajib diisi.', path: ['note'] });
    }
  });
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

/** Isi contoh produk sesuai jenis usaha. */
export const seedBusinessTypeSchema = z.enum(['kelontong', 'kedai', 'bangunan']);
export type SeedBusinessType = z.infer<typeof seedBusinessTypeSchema>;

export const productSeedSchema = z.object({
  businessType: seedBusinessTypeSchema,
});
export type ProductSeedInput = z.infer<typeof productSeedSchema>;

/** Format error baku API: { code, message, details? } berbahasa Indonesia. */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
