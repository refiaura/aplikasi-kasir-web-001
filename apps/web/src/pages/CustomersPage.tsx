import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@kasir/shared';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ApiRequestError, get, post } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { formatRupiah } from '../components/ui/MoneyText';import { useToast } from '../components/ui/Toast';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function CustomersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  const [onlyKasbon, setOnlyKasbon] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const params = new URLSearchParams();
  if (debouncedQ) params.set('q', debouncedQ);
  if (onlyKasbon) params.set('hasKasbon', 'true');
  const { data, isLoading } = useQuery({
    queryKey: ['customers', debouncedQ, onlyKasbon],
    queryFn: () => get<{ customers: Customer[] }>(`/customers?${params.toString()}`),
  });

  const create = async () => {
    try {
      await post('/customers', { name, phone: phone || undefined });
      setDialogOpen(false);
      setName('');
      setPhone('');
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ kind: 'success', title: 'Pelanggan ditambahkan' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal menambah',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    }
  };

  const customers = data?.customers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pelanggan</h1>
          <p className="text-sm text-tinta-muted">Kelola pelanggan dan kasbon.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Pelanggan</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-52 flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tinta-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama…"
            aria-label="Cari pelanggan"
            className="h-12 w-full rounded-[10px] border border-garis bg-surface pl-11 pr-4 text-base placeholder:text-tinta-muted focus:outline-2 focus:outline-pandan-600"
          />
        </label>
        <label className="flex h-12 cursor-pointer items-center gap-2 rounded-[10px] border border-garis bg-surface px-4 text-sm font-semibold">
          <input type="checkbox" checked={onlyKasbon} onChange={(e) => setOnlyKasbon(e.target.checked)} className="h-5 w-5" />
          Ada kasbon
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : customers.length === 0 ? (
        <p className="py-8 text-center text-sm text-tinta-muted">Belum ada pelanggan.</p>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                to="/pelanggan/$id"
                params={{ id: c.id }}
                className="flex items-center justify-between rounded-[14px] border border-garis bg-surface p-4 hover:border-pandan-600"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{c.name}</p>
                  {c.phone && <p className="text-sm text-tinta-muted">{c.phone}</p>}
                </div>
                {c.kasbonBalance > 0 ? (
                  <span className="shrink-0 rounded-[999px] bg-kunyit-50 px-3 py-1 text-sm font-bold text-kunyit-700 tabular-nums">
                    {formatRupiah(c.kasbonBalance)}
                  </span>
                ) : (
                  <span className="shrink-0 text-sm text-tinta-muted">Lunas</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title="Tambah pelanggan">
          <div className="space-y-4">
            <Input label="Nama" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Bu Sari" />
            <Input label="Telepon (opsional)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08…" />
            <Button size="lg" className="w-full" disabled={name.trim().length < 2} onClick={create}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
