import { useEffect, useState } from 'react';
import { useSessionStore } from '../../stores/session';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { cn } from '../../lib/cn';

interface DiscountDialogProps {
  open: boolean;
  title: string;
  initialRp?: number;
  initialPct?: number;
  onClose: () => void;
  /** Dipanggil dengan (rp, pct, approvalPassword?). */
  onApply: (rp: number, pct: number, approvalPassword: string | null) => void;
}

/**
 * Dialog diskon nominal atau persen. Bila kasir tak punya izin diskon dan ada
 * diskon > 0, minta kata sandi pemilik untuk persetujuan (D21).
 */
export function DiscountDialog({ open, title, initialRp, initialPct, onClose, onApply }: DiscountDialogProps) {
  const user = useSessionStore((s) => s.user);
  const canDiscount = user?.role === 'owner' || !!user?.permissions?.discount;
  const [mode, setMode] = useState<'rp' | 'pct'>(initialPct ? 'pct' : 'rp');
  const [value, setValue] = useState('');
  const [approvalPassword, setApprovalPassword] = useState('');

  useEffect(() => {
    if (open) {
      setMode(initialPct ? 'pct' : 'rp');
      setValue(String(initialPct ?? initialRp ?? ''));
      setApprovalPassword('');
    }
  }, [open, initialPct, initialRp]);

  const apply = () => {
    const v = Math.max(0, Number.parseInt(value || '0', 10) || 0);
    const rp = mode === 'rp' ? v : 0;
    const pct = mode === 'pct' ? Math.min(100, v) : 0;
    const needsApproval = !canDiscount && (rp > 0 || pct > 0);
    onApply(rp, pct, needsApproval ? approvalPassword : null);
    onClose();
  };

  const needsApproval = !canDiscount;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={title}>
        <div className="space-y-4">
          <div className="flex gap-2" role="group" aria-label="Jenis diskon">
            {(
              [
                ['rp', 'Nominal (Rp)'],
                ['pct', 'Persen (%)'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-[10px] border px-4 py-3 text-sm font-bold',
                  mode === m ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            label={mode === 'rp' ? 'Diskon (Rp)' : 'Diskon (%)'}
            type="number"
            min={0}
            max={mode === 'pct' ? 100 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
          />
          {needsApproval && (
            <div className="rounded-[10px] border border-kunyit-500 bg-kunyit-50 p-3">
              <p className="mb-2 text-sm font-semibold">
                Kamu tidak punya izin diskon. Minta pemilik mengetik kata sandinya:
              </p>
              <Input
                label="Kata sandi pemilik"
                type="password"
                value={approvalPassword}
                onChange={(e) => setApprovalPassword(e.target.value)}
                placeholder="Diketik oleh pemilik"
              />
            </div>
          )}
          <Button size="lg" className="w-full" onClick={apply}>
            Terapkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
