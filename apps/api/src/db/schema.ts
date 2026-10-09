import {
  bigserial,
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/** citext untuk email: unik case-insensitive di level database. */
const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

export const userRoleEnum = pgEnum('user_role', ['owner', 'cashier']);

/** Jenis mutasi stok (lengkap sesuai PRD; Fase 2 memakai purchase & adjustment). */
export const moveTypeEnum = pgEnum('move_type', ['sale', 'purchase', 'adjustment', 'void', 'refund']);

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  logoUrl: text('logo_url'),
  qrisImageUrl: text('qris_image_url'),
  receiptFooter: text('receipt_footer'),
  businessType: text('business_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    name: text('name').notNull(),
    email: citext('email').unique(),
    phone: text('phone').unique(),
    passwordHash: text('password_hash'),
    pinHash: text('pin_hash'),
    role: userRoleEnum('role').notNull(),
    permissions: jsonb('permissions').$type<Record<string, boolean>>().default({}).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('users_store_id_idx').on(t.storeId)],
);

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique('devices_store_code_unique').on(t.storeId, t.code),
    index('devices_store_id_idx').on(t.storeId),
  ],
);

/** Sesi server-side (D1 di docs/DECISIONS.md). */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    storeId: uuid('store_id').references(() => stores.id),
    userId: uuid('user_id').references(() => users.id),
    action: text('action').notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('audit_logs_store_id_idx').on(t.storeId)],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique('categories_store_name_unique').on(t.storeId, t.name),
    index('categories_store_id_idx').on(t.storeId),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    categoryId: uuid('category_id').references(() => categories.id),
    name: text('name').notNull(),
    sku: text('sku'),
    barcode: text('barcode'),
    unit: text('unit').default('pcs').notNull(),
    /** Rupiah integer (mode number: aman hingga Rp9.007.199.254.740.993). */
    price: bigint('price', { mode: 'number' }).notNull(),
    cost: bigint('cost', { mode: 'number' }).default(0).notNull(),
    trackStock: boolean('track_stock').default(true).notNull(),
    /** numeric(12,3) — dikembalikan sebagai string oleh pg; dikonversi di route. */
    stockQty: numeric('stock_qty', { precision: 12, scale: 3 }).default('0').notNull(),
    minStock: numeric('min_stock', { precision: 12, scale: 3 }).default('0').notNull(),
    imageUrl: text('image_url'),
    isActive: boolean('is_active').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('products_store_sku_unique').on(t.storeId, t.sku),
    unique('products_store_barcode_unique').on(t.storeId, t.barcode),
    index('products_store_id_idx').on(t.storeId),
    index('products_store_updated_idx').on(t.storeId, t.updatedAt),
    // Index trigram untuk pencarian nama ditambahkan manual di migrasi
    // (CREATE INDEX ... USING gin (name gin_trgm_ops)).
  ],
);

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    type: moveTypeEnum('type').notNull(),
    /** ±: positif masuk, negatif keluar. numeric(12,3). */
    qty: numeric('qty', { precision: 12, scale: 3 }).notNull(),
    unitCost: bigint('unit_cost', { mode: 'number' }),
    refId: uuid('ref_id'),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('stock_movements_store_id_idx').on(t.storeId),
    index('stock_movements_product_id_idx').on(t.productId),
  ],
);
