import { cn } from '../../lib/cn';

/**
 * Format rupiah dari integer (BIGINT rupiah, tanpa desimal):
 * 12500 → "Rp12.500", -5000 → "−Rp5.000" (minus U+2212 sesuai PRD).
 */
export function formatRupiah(value: number | bigint): string {
  const n = typeof value === 'bigint' ? value : BigInt(Math.trunc(value));
  const abs = n < 0n ? -n : n;
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0n ? '−' : ''}Rp${grouped}`;
}

interface MoneyTextProps {
  value: number | bigint;
  className?: string;
}

/** Teks uang dengan angka tabular agar kolom harga rapi. */
export function MoneyText({ value, className }: MoneyTextProps) {
  return <span className={cn('tabular-nums', className)}>{formatRupiah(value)}</span>;
}
