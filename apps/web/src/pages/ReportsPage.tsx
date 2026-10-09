import { useQuery } from '@tanstack/react-query';
import type { CashierStat, ReportSummary, TopProduct } from '@kasir/shared';
import { useState } from 'react';
import { get } from '../lib/api';
import { MoneyText, formatRupiah } from '../components/ui/MoneyText';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  kasbon: 'Kasbon',
  other: 'Lainnya',
};

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function shiftIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function monthStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

const PRESETS = [
  { label: 'Hari ini', get: () => [todayIso(), todayIso()] as const },
  { label: '7 hari', get: () => [shiftIso(-6), todayIso()] as const },
  { label: '30 hari', get: () => [shiftIso(-29), todayIso()] as const },
  { label: 'Bulan ini', get: () => [monthStartIso(), todayIso()] as const },
] as const;

export function ReportsPage() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [preset, setPreset] = useState<string | null>('Hari ini');
  const params = `from=${from}&to=${to}`;

  const summaryQ = useQuery({
    queryKey: ['reports', 'summary', from, to],
    queryFn: () => get<{ summary: ReportSummary }>(`/reports/summary?${params}`),
  });
  const topQ = useQuery({
    queryKey: ['reports', 'top', from, to],
    queryFn: () => get<{ products: TopProduct[] }>(`/reports/top-products?${params}&limit=10`),
  });
  const cashierQ = useQuery({
    queryKey: ['reports', 'cashier', from, to],
    queryFn: () => get<{ cashiers: CashierStat[] }>(`/reports/by-cashier?${params}`),
  });

  const s = summaryQ.data?.summary;
  const loading = summaryQ.isLoading || topQ.isLoading || cashierQ.isLoading;
  const maxMethod = Math.max(1, ...(s?.byMethod.map((m) => m.total) ?? [1]));

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const [f, t] = p.get();
    setFrom(f);
    setTo(t);
    setPreset(p.label);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" desc="Zona waktu Asia/Jakarta." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2" role="group" aria-label="Rentang cepat">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              aria-pressed={preset === p.label}
              className={cn(
                'h-10 rounded-[999px] border px-4 text-sm font-bold',
                preset === p.label
                  ? 'border-pandan-600 bg-pandan-50 text-pandan-600'
                  : 'border-garis bg-surface text-tinta-muted hover:bg-kertas',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Input
          label="Dari"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPreset(null);
          }}
        />
        <Input
          label="Sampai"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPreset(null);
          }}
        />
      </div>

      {loading || !s ? (
        <div className="space-y-4" aria-label="Memuat laporan">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24" />
            ))}
          </div>
          <div className="skeleton h-40" />
          <div className="skeleton h-32" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Omzet">
              <p className="text-sm text-tinta-muted">Omzet</p>
              <MoneyText value={s.omzet} className="mt-1 text-2xl font-extrabold" />
            </section>
            <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Laba kotor">
              <p className="text-sm text-tinta-muted">Laba kotor</p>
              <MoneyText value={s.labaKotor} className="mt-1 text-2xl font-extrabold" />
            </section>
            <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Transaksi">
              <p className="text-sm text-tinta-muted">Transaksi</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{s.transaksi}</p>
            </section>
            <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Rata-rata">
              <p className="text-sm text-tinta-muted">Rata-rata/transaksi</p>
              <MoneyText value={s.rataRata} className="mt-1 text-2xl font-extrabold" />
            </section>
          </div>

          <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Per metode bayar">
            <h2 className="mb-3 font-bold">Per metode pembayaran</h2>
            {s.byMethod.length === 0 ? (
              <p className="text-sm text-tinta-muted">Belum ada transaksi.</p>
            ) : (
              <ul className="space-y-3">
                {s.byMethod.map((m) => (
                  <li key={m.method}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">
                        {METHOD_LABEL[m.method] ?? m.method} · {m.transaksi}×
                      </span>
                      <MoneyText value={m.total} className="font-bold tabular-nums" />
                    </div>
                    <div
                      className="mt-1 h-2 overflow-hidden rounded-[999px] bg-kertas"
                      role="img"
                      aria-label={`${METHOD_LABEL[m.method] ?? m.method}: ${formatRupiah(m.total)}`}
                    >
                      <div
                        className="h-full rounded-[999px] bg-pandan-600"
                        style={{ width: `${Math.max(2, (m.total / maxMethod) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Produk terlaris">
            <h2 className="mb-3 font-bold">Produk terlaris</h2>
            {(topQ.data?.products.length ?? 0) === 0 ? (
              <p className="text-sm text-tinta-muted">Belum ada penjualan.</p>
            ) : (
              <ol className="space-y-2">
                {topQ.data!.products.map((p, i) => (
                  <li key={p.productId} className="flex items-center gap-3 text-sm">
                    <span className="w-6 shrink-0 text-center font-extrabold tabular-nums text-tinta-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-tinta-muted">{p.qty} terjual</span>
                    <MoneyText value={p.omzet} className="w-28 shrink-0 text-right font-bold tabular-nums" />
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Per kasir">
            <h2 className="mb-3 font-bold">Per kasir</h2>
            {(cashierQ.data?.cashiers.length ?? 0) === 0 ? (
              <p className="text-sm text-tinta-muted">Belum ada penjualan.</p>
            ) : (
              <ul className="space-y-2">
                {cashierQ.data!.cashiers.map((c) => (
                  <li key={c.cashierId} className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {c.name} · {c.transaksi} transaksi
                    </span>
                    <MoneyText value={c.omzet} className="font-bold tabular-nums" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
