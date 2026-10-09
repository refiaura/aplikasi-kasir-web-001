import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@kasir/shared';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ApiRequestError, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import { AuthShell } from '../components/ui/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
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
    <AuthShell
      title="Daftarkan tokomu"
      desc="Gratis untuk 1 outlet. Bisa langsung transaksi."
      footer={
        <>
          <p className="text-tinta-muted">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold text-pandan-600 hover:underline">
              Masuk
            </Link>
          </p>
          <p className="text-xs text-tinta-muted">
            Dengan mendaftar, kamu menyetujui{' '}
            <Link to="/syarat" className="font-semibold text-pandan-600 hover:underline">
              Syarat layanan
            </Link>{' '}
            dan{' '}
            <Link to="/privasi" className="font-semibold text-pandan-600 hover:underline">
              Kebijakan privasi
            </Link>
            .
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Nama kamu" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Nama toko"
          autoComplete="organization"
          error={errors.storeName?.message}
          {...register('storeName')}
        />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordInput
          label="Kata sandi"
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
    </AuthShell>
  );
}
