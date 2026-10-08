import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashierCreateSchema, deviceCreateSchema, type Device, type CashierCreateInput, type DeviceCreateInput } from '@kasir/shared';
import { useForm } from 'react-hook-form';
import { ApiRequestError, get, post } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

interface Cashier {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

function DeviceSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => get<{ devices: Device[] }>('/devices'),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeviceCreateInput>({ resolver: zodResolver(deviceCreateSchema) });

  const mutation = useMutation({
    mutationFn: (input: DeviceCreateInput) => post<{ device: Device }>('/devices', input),
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast({ kind: 'success', title: 'Perangkat terdaftar' });
    },
    onError: (e) => {
      toast({
        kind: 'error',
        title: 'Gagal mendaftarkan perangkat',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    },
  });

  return (
    <section className="rounded-[14px] border border-garis bg-surface p-6" aria-label="Perangkat">
      <h2 className="text-xl font-bold">Perangkat</h2>
      <p className="mt-1 text-sm text-tinta-muted">
        Daftarkan tiap tablet/HP kasir dengan kode unik, mis. <span className="font-semibold">KASIR-01</span>.
      </p>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        noValidate
      >
        <Input label="Kode perangkat" placeholder="KASIR-01" error={errors.code?.message} {...register('code')} />
        <Input label="Nama perangkat" placeholder="Tablet depan" error={errors.name?.message} {...register('name')} />
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          Daftarkan
        </Button>
      </form>
      <div className="mt-4">
        {isLoading ? (
          <div className="skeleton h-12" />
        ) : !data || data.devices.length === 0 ? (
          <p className="text-sm text-tinta-muted">Belum ada perangkat. Daftarkan yang pertama di atas.</p>
        ) : (
          <ul className="divide-y divide-garis rounded-[10px] border border-garis">
            {data.devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold">{d.code}</p>
                  <p className="text-sm text-tinta-muted">{d.name}</p>
                </div>
                <span className="rounded-[999px] bg-pandan-50 px-2.5 py-1 text-xs font-bold text-pandan-600">
                  Terdaftar
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CashierSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => get<{ users: Cashier[] }>('/users'),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CashierCreateInput>({ resolver: zodResolver(cashierCreateSchema) });

  const mutation = useMutation({
    mutationFn: (input: CashierCreateInput) => post<{ user: Cashier }>('/users', input),
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ kind: 'success', title: 'Akun kasir dibuat' });
    },
    onError: (e) => {
      toast({
        kind: 'error',
        title: 'Gagal membuat akun kasir',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    },
  });

  const cashiers = data?.users.filter((u) => u.role === 'cashier') ?? [];

  return (
    <section className="rounded-[14px] border border-garis bg-surface p-6" aria-label="Kasir">
      <h2 className="text-xl font-bold">Kasir</h2>
      <p className="mt-1 text-sm text-tinta-muted">
        Kasir masuk lewat halaman PIN memakai kode perangkat + PIN 6 digit ini.
      </p>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        noValidate
      >
        <Input label="Nama kasir" placeholder="Nama kasir" error={errors.name?.message} {...register('name')} />
        <Input
          label="PIN (6 digit)"
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          error={errors.pin?.message}
          {...register('pin')}
        />
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          Buat akun
        </Button>
      </form>
      <div className="mt-4">
        {isLoading ? (
          <div className="skeleton h-12" />
        ) : cashiers.length === 0 ? (
          <p className="text-sm text-tinta-muted">Belum ada akun kasir. Buat yang pertama di atas.</p>
        ) : (
          <ul className="divide-y divide-garis rounded-[10px] border border-garis">
            {cashiers.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <p className="font-semibold">{c.name}</p>
                <span className="rounded-[999px] bg-pandan-50 px-2.5 py-1 text-xs font-bold text-pandan-600">
                  Aktif
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function DevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Perangkat & kasir</h1>
        <p className="text-sm text-tinta-muted">Siapkan perangkat dan akun kasir sebelum buka toko.</p>
      </div>
      <DeviceSection />
      <CashierSection />
    </div>
  );
}
