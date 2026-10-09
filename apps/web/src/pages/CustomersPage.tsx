import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@kasir/shared';
import { Plus, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ApiRequestError, get, post } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { formatRupiah } from '../components/ui/MoneyText';import { useToast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';

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
      <PageHeader
        title="Pelanggan"
        desc="Kelola pelanggan dan kasbon."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={18} />
            Tambah
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-52 flex-1">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama…"
            aria-label="Cari pelanggan"
            leading={<Search size={18} />}
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyKasbon((v) => !v)}
          aria-pressed={onlyKasbon}
          className={cn(
            'h-12 rounded-[999px] border px-4 text-sm font-bold',
            onlyKasbon
              ? 'border-pandan-600 bg-pandan-50 text-pandan-600'
              : 'border-garis bg-surface text-tinta-muted hover:bg-kertas',
          )}
        >
          Ada kasbon
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada pelanggan"
          desc="Tambahkan pelanggan agar kasbon bisa dicatat atas nama."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={18} />
              Tambah pelanggan
            </Button>
          }
        />
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
