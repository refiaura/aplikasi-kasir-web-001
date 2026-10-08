import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { afterEach, beforeAll } from 'vitest';
import * as schema from '../src/db/schema.js';
import { clearAllAttempts } from '../src/lib/ratelimit.js';

/**
 * Test yang butuh database dilewati bila DATABASE_URL tidak diisi
 * (mis. sandbox tanpa Postgres). Di CI, DATABASE_URL selalu diisi.
 */
const databaseUrl = process.env.DATABASE_URL;

export const testDb = databaseUrl
  ? drizzle(new Pool({ connectionString: databaseUrl }), { schema })
  : undefined;
export type TestDb = Exclude<typeof testDb, undefined>;

if (testDb) {
  beforeAll(async () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    await migrate(testDb, { migrationsFolder: join(dir, '..', 'drizzle') });
  }, 60000);

  afterEach(async () => {
    await testDb.execute(
      sql`TRUNCATE audit_logs, sessions, devices, users, stores RESTART IDENTITY CASCADE`,
    );
    clearAllAttempts();
  });
}
