import { useQuery } from '@tanstack/react-query';
import type { DashboardSummary } from '@kasir/shared';
import { AlertTriangle, HandCoins, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { get } from '../lib/api';
import { MoneyText, formatRupiah } from '../components/ui/MoneyText';

const cards = [
  { key: 'omzet', label: 'Omzet hari ini', icon: Wallet, money: true },
  { key: 'labaKotor', label: 'Laba kotor', icon: TrendingUp, money: true },
  { key: 'transaksi', label: 'Jumlah transaksi', icon: ReceiptText, money: false },
  { key: 'kasbonAktif', label: 'Kasbon belum lunas', icon: HandCoins, money: false },
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
    <div className="flex h-40 items-end gap-2" role="img" aria-label="Grafik omzet 7 hari">
      {days.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${formatRupiah(d.omzet)}`}>
          <div
            className="w-full rounded-t-[6px] bg-pandan-500"
            style={{ height: `${Math.max(4, (d.omzet / max) * 120)}px` }}
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
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-sm text-tinta-muted">Ringkasan usaha hari ini.</p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map(({ key, label, icon: Icon, money }) => (
              <section
                key={key}
                className="rounded-[14px] border border-garis bg-surface p-4"
                aria-label={label}
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
              </section>
            ))}
          </div>

          <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Omzet 7 hari">
            <h2 className="mb-3 font-bold">Omzet 7 hari terakhir</h2>
            <WeeklyChart weekly={data.weekly} />
          </section>

          {(data.stokMinus.length > 0 || data.stokMenipis.length > 0) && (
            <section className="rounded-[14px] border border-kunyit-500 bg-kunyit-50 p-4" aria-label="Peringatan stok">
              <h2 className="flex items-center gap-2 font-bold">
                <AlertTriangle size={18} />
                Perlu perhatian
              </h2>
              <ul className="mt-2 space-y-1 text-sm">
                {data.stokMinus.map((p) => (
                  <li key={p.id} className="font-semibold text-cabai-600">
                    {p.name}: stok minus ({p.stockQty} {p.unit}) — periksa segera
                  </li>
                ))}
                {data.stokMenipis.map((p) => (
                  <li key={p.id}>
                    {p.name}: sisa {p.stockQty} {p.unit}{' '}
                    <Link to="/produk" className="font-semibold text-pandan-600 hover:underline">
                      tambah stok
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
