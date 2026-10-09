import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@kasir/shared';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ApiRequestError, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import { AuthShell } from '../components/ui/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
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
    <AuthShell
      title="Masuk sebagai pemilik"
      desc="Kelola tokomu dari sini."
      footer={
        <>
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
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordInput
          label="Kata sandi"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>
    </AuthShell>
  );
}
