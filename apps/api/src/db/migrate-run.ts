/**
 * Runner migrasi untuk production/docker: `node dist/db/migrate-run.js`.
 * Di dev/test, migrasi dijalankan via `pnpm db:migrate` (tsx).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool, db } from './index.js';

const dir = dirname(fileURLToPath(import.meta.url));
// dist/db -> <pkg>/drizzle (dev: src/db -> <pkg>/drizzle)
const migrationsFolder = join(dir, '..', '..', 'drizzle');

await migrate(db, { migrationsFolder });
await pool.end();
console.log('Migrasi selesai.');
