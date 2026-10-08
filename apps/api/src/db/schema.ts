import {
  bigserial,
  boolean,
  customType,
  index,
  jsonb,
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
