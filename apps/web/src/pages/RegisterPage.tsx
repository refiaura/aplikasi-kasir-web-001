import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@kasir/shared';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ApiRequestError, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const fetchMe = useSessionStore((s) => s.fetchMe);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    try {
      await post('/auth/register', data);
      await fetchMe();
      toast({ kind: 'success', title: 'Pendaftaran berhasil', desc: 'Selamat datang di Kasir UMKM.' });
      void navigate({ to: '/' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal mendaftar',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Daftarkan tokomu</h1>
      <p className="mt-1 text-sm text-tinta-muted">Gratis untuk 1 outlet. Bisa langsung transaksi.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Input label="Nama kamu" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Nama toko"
          autoComplete="organization"
          error={errors.storeName?.message}
          {...register('storeName')}
        />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Kata sandi"
          type="password"
          autoComplete="new-password"
          hint="Minimal 8 karakter."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Nomor telepon (opsional)"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Memproses…' : 'Daftar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-tinta-muted">
        Sudah punya akun?{' '}
        <Link to="/login" className="font-semibold text-pandan-600 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
