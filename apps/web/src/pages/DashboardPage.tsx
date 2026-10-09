import { useQuery } from '@tanstack/react-query';
import type { DashboardSummary } from '@kasir/shared';
import { AlertTriangle, HandCoins, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { get } from '../lib/api';
import { Button } from '../components/ui/Button';
import { MoneyText, formatRupiah } from '../components/ui/MoneyText';
import { PageHeader } from '../components/ui/PageHeader';

const cards = [
  { key: 'omzet', label: 'Omzet hari ini', icon: Wallet, money: true, to: '/laporan' },
  { key: 'labaKotor', label: 'Laba kotor', icon: TrendingUp, money: true, to: '/laporan' },
  { key: 'transaksi', label: 'Jumlah transaksi', icon: ReceiptText, money: false, to: '/riwayat' },
  { key: 'kasbonAktif', label: 'Kasbon belum lunas', icon: HandCoins, money: false, to: '/pelanggan' },
] as const;

/** Grafik batang 7 hari — custom ringan tanpa library. */
function WeeklyChart({ weekly }: { weekly: DashboardSummary['weekly'] }) {
  // Lengkapi 7 hari terakhir (termasuk hari tanpa transaksi).
  const days: { date: string; label: string; omzet: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const found = weekly.find((w) => w.date === iso);
    days.push({
      date: iso,
      label: d.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'Asia/Jakarta' }),
      omzet: found?.omzet ?? 0,
    });
  }
  const max = Math.max(1, ...days.map((d) => d.omzet));
  return (
    <div className="flex h-48 items-end gap-2" role="img" aria-label="Grafik omzet 7 hari">
      {days.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
          {d.omzet > 0 && (
            <span className="text-xs font-bold tabular-nums text-tinta-muted">
              {d.omzet >= 1_000_000
                ? `${(d.omzet / 1_000_000).toFixed(1)}jt`
                : d.omzet >= 1000
                  ? `${Math.round(d.omzet / 1000)}rb`
                  : formatRupiah(d.omzet)}
            </span>
          )}
          <div
            className="w-full rounded-t-[6px] bg-pandan-600"
            style={{ height: `${Math.max(4, (d.omzet / max) * 110)}px` }}
            title={`${d.date}: ${formatRupiah(d.omzet)}`}
          />
          <span className="text-xs text-tinta-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => get<DashboardSummary>('/dashboard/summary'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" desc="Ringkasan usaha hari ini." />

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map(({ key, label, icon: Icon, money, to }) => (
              <Link
                key={key}
                to={to}
                className="rounded-[14px] border border-garis bg-surface p-4 transition-colors hover:border-pandan-600"
                aria-label={`${label}: lihat detail`}
              >
                <div className="flex items-center gap-2 text-tinta-muted">
                  <Icon size={18} />
                  <p className="text-sm font-medium">{label}</p>
                </div>
                <p className="mt-2">
                  {money ? (
                    <MoneyText value={data.today[key]} className="text-2xl font-extrabold" />
                  ) : (
                    <span className="text-2xl font-extrabold tabular-nums">{data.today[key]}</span>
                  )}
                </p>
              </Link>
            ))}
          </div>

          <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Omzet 7 hari">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Omzet 7 hari terakhir</h2>
              <Link to="/laporan" className="text-sm font-bold text-pandan-600 hover:underline">
                Lihat laporan
              </Link>
            </div>
            <WeeklyChart weekly={data.weekly} />
          </section>

          {(data.stokMinus.length > 0 || data.stokMenipis.length > 0) && (
            <section className="rounded-[14px] border border-kunyit-500 bg-kunyit-50 p-4" aria-label="Peringatan stok">
              <h2 className="flex items-center gap-2 font-bold">
                <AlertTriangle size={18} />
                Perlu perhatian
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.stokMinus.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-surface p-3"
                  >
                    <span className="font-semibold text-cabai-600">
                      {p.name}: stok minus ({p.stockQty} {p.unit})
                    </span>
                    <Link to="/produk">
                      <Button size="sm" variant="secondary">
                        Periksa
                      </Button>
                    </Link>
                  </li>
                ))}
                {data.stokMenipis.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-surface p-3"
                  >
                    <span>
                      {p.name}: sisa {p.stockQty} {p.unit}
                    </span>
                    <Link to="/produk">
                      <Button size="sm" variant="secondary">
                        Tambah stok
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
