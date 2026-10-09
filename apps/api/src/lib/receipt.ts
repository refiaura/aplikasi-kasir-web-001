import { sql } from 'drizzle-orm';
import type { Db } from '../db/index.js';

/** Tanggal YYYYMMDD dalam zona waktu toko (default Asia/Jakarta). */
function storeDate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return parts.replace(/-/g, '');
}

/**
 * Nomor struk INV-YYYYMMDD-NNNN. Counter per toko per hari, dinaikkan secara
 * atomik (aman dari duplikat saat dua kasir jual bersamaan).
 */
export async function nextReceiptNo(db: Db, storeId: string, now: Date): Promise<string> {
  const date = storeDate(now);
  const result = await db.execute<{ last_no: number }>(sql`
    INSERT INTO receipt_counters (store_id, date, last_no)
    VALUES (${storeId}, ${date}, 1)
    ON CONFLICT (store_id, date) DO UPDATE SET last_no = receipt_counters.last_no + 1
    RETURNING last_no
  `);
  const no = result.rows[0]?.last_no ?? 1;
  return `INV-${date}-${String(no).padStart(4, '0')}`;
}
