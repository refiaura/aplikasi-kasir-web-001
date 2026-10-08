import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ApiRequestError, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { NumberPad } from '../components/ui/NumberPad';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/cn';

export function PinPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const fetchMe = useSessionStore((s) => s.fetchMe);
  const [deviceCode, setDeviceCode] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (deviceCode.trim().length === 0 || pin.length !== 6 || submitting) return;
    setSubmitting(true);
    try {
      await post('/auth/pin', { deviceCode: deviceCode.trim(), pin });
      await fetchMe();
      void navigate({ to: '/' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal masuk',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Masuk sebagai kasir</h1>
      <p className="mt-1 text-sm text-tinta-muted">Masukkan kode perangkat dan PIN 6 digit.</p>

      <div className="mt-6">
        <Input
          label="Kode perangkat"
          value={deviceCode}
          onChange={(e) => setDeviceCode(e.target.value)}
          placeholder="mis. KASIR-01"
          autoComplete="off"
        />
      </div>

      <div className="mt-4 flex justify-center gap-3" aria-label="PIN">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              'flex h-12 w-10 items-center justify-center rounded-[10px] border text-xl font-bold',
              i < pin.length ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface',
            )}
          >
            {i < pin.length ? '•' : ''}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <NumberPad
          disabled={submitting}
          onInput={(d) => setPin((p) => (p.length < 6 ? p + d : p))}
          onDelete={() => setPin((p) => p.slice(0, -1))}
        />
      </div>

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={submitting || pin.length !== 6 || deviceCode.trim().length === 0}
        onClick={handleSubmit}
      >
        {submitting ? 'Memproses…' : 'Masuk'}
      </Button>

      <p className="mt-6 text-center text-sm text-tinta-muted">
        Pemilik toko?{' '}
        <Link to="/login" className="font-semibold text-pandan-600 hover:underline">
          Masuk dengan email
        </Link>
      </p>
    </div>
  );
}
