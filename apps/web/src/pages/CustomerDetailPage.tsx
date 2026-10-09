import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type { Customer, KasbonEntry } from '@kasir/shared';
import { useState } from 'react';
import { ApiRequestError, get, post } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { MoneyText, formatRupiah } from '../components/ui/MoneyText';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/cn';

export function CustomerDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const toast = useToast();
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [reference, setReference] = useState('');

  const customerQ = useQuery({
    queryKey: ['customers', id],
    queryFn: () => get<{ customer: Customer }>(`/customers/${id}`),
  });
  const kasbonQ = useQuery({
    queryKey: ['customers', id, 'kasbon'],
    queryFn: () => get<{ entries: KasbonEntry[] }>(`/customers/${id}/kasbon`),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['customers', id] });
    void queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const pay = async () => {
    const value = Number.parseInt(amount || '0', 10) || 0;
    try {
      await post(`/customers/${id}/kasbon-payments`, {
        amount: value,
        method,
        reference: reference || undefined,
      });
      setPayOpen(false);
      setAmount('');
      setReference('');
      refresh();
      toast({ kind: 'success', title: 'Pembayaran tercatat' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal membayar',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    }
  };

  const customer = customerQ.data?.customer;
  const entries = kasbonQ.data?.entries ?? [];

  if (customerQ.isLoading || !customer) {
    return <div className="skeleton h-40" />;
  }

  const waText = `Halo ${customer.name}, ini pengingat kasbon di toko kami sebesar ${formatRupiah(customer.kasbonBalance)}. Terima kasih.`;
  const waUrl = customer.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={customer.name}
        desc={customer.phone ?? undefined}
        backTo="/pelanggan"
        trail={[{ label: 'Pelanggan', to: '/pelanggan' }, { label: customer.name }]}
      />

      <section className="rounded-[14px] border border-garis bg-surface p-4" aria-label="Saldo kasbon">
        <p className="text-sm text-tinta-muted">Sisa kasbon</p>
        <MoneyText value={customer.kasbonBalance} className="mt-1 text-3xl font-extrabold" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={customer.kasbonBalance <= 0} onClick={() => setPayOpen(true)}>
            Bayar kasbon
          </Button>
          {waUrl && customer.kasbonBalance > 0 && (
            <Button asChild>
              <a href={waUrl} target="_blank" rel="noreferrer">
                Ingatkan via WhatsApp
              </a>
            </Button>
          )}
        </div>
      </section>

      <section aria-label="Riwayat kasbon">
        <h2 className="mb-2 font-bold">Riwayat</h2>
        {kasbonQ.isLoading ? (
          <div className="skeleton h-24" />
        ) : entries.length === 0 ? (
          <p className="text-sm text-tinta-muted">Belum ada riwayat kasbon.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-garis bg-surface p-3 text-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span
                      className={cn(
                        'rounded-[999px] px-2 py-0.5 text-xs font-bold',
                        e.amount > 0 ? 'bg-cabai-600/10 text-cabai-600' : 'bg-pandan-50 text-pandan-600',
                      )}
                    >
                      {e.amount > 0 ? 'Kasbon' : 'Pembayaran'}
                    </span>
                    {e.note && <span className="truncate">{e.note}</span>}
                  </p>
                  <p className="mt-0.5 text-tinta-muted">
                    {new Date(e.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                    {e.receiptNo ? ` · ${e.receiptNo}` : ''}
                  </p>
                </div>
                <span className={cn('shrink-0 font-extrabold tabular-nums', e.amount > 0 ? 'text-cabai-600' : 'text-pandan-600')}>
                  {e.amount > 0 ? '+' : '−'}{formatRupiah(Math.abs(e.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent title="Bayar kasbon">
          <div className="space-y-4">
            <p className="text-sm text-tinta-muted">
              Sisa: <span className="font-extrabold text-tinta tabular-nums">{formatRupiah(customer.kasbonBalance)}</span>
            </p>
            <Input label="Nominal (Rp)" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex gap-2" role="group" aria-label="Metode">
              {(['cash', 'qris', 'transfer'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    'flex-1 rounded-[10px] border px-2 py-3 text-sm font-bold capitalize',
                    method === m ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface',
                  )}
                >
                  {m === 'cash' ? 'Tunai' : m.toUpperCase()}
                </button>
              ))}
            </div>
            {method !== 'cash' && (
              <Input label="No. referensi" value={reference} onChange={(e) => setReference(e.target.value)} />
            )}
            <Button size="lg" className="w-full" disabled={(Number.parseInt(amount || '0', 10) || 0) <= 0} onClick={pay}>
              Bayar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
