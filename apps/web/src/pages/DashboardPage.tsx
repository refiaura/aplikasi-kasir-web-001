import { useQuery } from '@tanstack/react-query';
import type { DashboardSummary } from '@kasir/shared';
import { HandCoins, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import { get } from '../lib/api';
import { MoneyText } from '../components/ui/MoneyText';

const cards = [
  { key: 'omzet', label: 'Omzet hari ini', icon: Wallet },
  { key: 'labaKotor', label: 'Laba kotor', icon: TrendingUp },
  { key: 'transaksi', label: 'Jumlah transaksi', icon: ReceiptText },
  { key: 'kasbonAktif', label: 'Kasbon belum lunas', icon: HandCoins },
] as const;

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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ key, label, icon: Icon }) => (
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
                {key === 'transaksi' ? (
                  <span className="text-2xl font-extrabold tabular-nums">{data.today[key]}</span>
                ) : (
                  <MoneyText value={data.today[key]} className="text-2xl font-extrabold" />
                )}
              </p>
            </section>
          ))}
        </div>
      )}

      <section className="rounded-[14px] border border-garis bg-surface p-8 text-center">
        <p className="text-base font-semibold">Belum ada transaksi hari ini.</p>
        <p className="mt-1 text-sm text-tinta-muted">
          Transaksi, grafik, dan stok menipis akan tampil di sini mulai Fase 2–4.
        </p>
      </section>
    </div>
  );
}
