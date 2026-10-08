import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@kasir/shared';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ApiRequestError, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

export function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const fetchMe = useSessionStore((s) => s.fetchMe);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      await post('/auth/login', data);
      await fetchMe();
      void navigate({ to: '/' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal masuk',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Masuk sebagai pemilik</h1>
      <p className="mt-1 text-sm text-tinta-muted">Kelola tokomu dari sini.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm">
        <p className="text-tinta-muted">
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-semibold text-pandan-600 hover:underline">
            Daftar dulu
          </Link>
        </p>
        <p className="text-tinta-muted">
          Kasir?{' '}
          <Link to="/pin" className="font-semibold text-pandan-600 hover:underline">
            Masuk dengan PIN
          </Link>
        </p>
      </div>
    </div>
  );
}
