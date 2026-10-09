import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ApiRequestError, post } from '../lib/api';
import { useSessionStore } from '../stores/session';
import { AuthShell } from '../components/ui/AuthShell';
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
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async () => {
    if (deviceCode.trim().length === 0 || pin.length !== 6 || submitting) return;
    setSubmitting(true);
    try {
      await post('/auth/pin', { deviceCode: deviceCode.trim(), pin });
      // Simpan kode perangkat untuk nomor nota lokal saat offline (Fase 5).
      try {
        localStorage.setItem('kasir-device-code', deviceCode.trim().toUpperCase());
      } catch {
        // Abaikan: penyimpanan lokal tidak tersedia.
      }
      await fetchMe();
      void navigate({ to: '/' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal masuk',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
      setPin('');
      setShakeKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Masuk sebagai kasir"
      desc="Masukkan kode perangkat dan PIN 6 digit."
      footer={
        <p className="text-tinta-muted">
          Pemilik toko?{' '}
          <Link to="/login" className="font-semibold text-pandan-600 hover:underline">
            Masuk dengan email
          </Link>
        </p>
      }
    >
      <Input
        label="Kode perangkat"
        value={deviceCode}
        onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
        placeholder="mis. KASIR-01"
        autoComplete="off"
        className="uppercase"
      />

      <div
        key={shakeKey}
        className={cn('mt-4 flex justify-center gap-3', shakeKey > 0 && 'anim-shake')}
        aria-label="PIN"
        role="status"
        aria-live="polite"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              'flex h-12 w-10 items-center justify-center rounded-[10px] border text-xl font-bold',
              i < pin.length
                ? 'border-pandan-600 bg-pandan-50 text-pandan-600'
                : shakeKey > 0 && pin.length === 0
                  ? 'border-cabai-600 bg-surface'
                  : 'border-garis bg-surface',
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
    </AuthShell>
  );
}
