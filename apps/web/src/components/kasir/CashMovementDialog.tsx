import { useEffect, useState } from 'react';
import { ApiRequestError, post } from '../../lib/api';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

export function CashMovementDialog({
  open,
  shiftId,
  onClose,
  onDone,
}: {
  open: boolean;
  shiftId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setType('in');
      setAmount('');
      setNote('');
    }
  }, [open ]);

  const submit = async () => {
    const value = Number.parseInt(amount || '0', 10) || 0;
    if (value <= 0) {
      toast({ kind: 'error', title: 'Nominal harus lebih dari 0.' });
      return;
    }
    setBusy(true);
    try {
      await post(`/shifts/${shiftId}/cash-movements`, {
        amount: type === 'in' ? value : -value,
        note,
      });
      toast({ kind: 'success', title: type === 'in' ? 'Kas masuk tercatat' : 'Kas keluar tercatat' });
      onDone();
      onClose();
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal mencatat',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Kas masuk / keluar">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(
              [
                ['in', 'Kas masuk'],
                ['out', 'Kas keluar'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 rounded-[10px] border px-4 py-3 text-sm font-bold',
                  type === t ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            label="Nominal (Rp)"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input label="Keterangan" value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. Modal tambahan" />
          <Button size="lg" className="w-full" disabled={busy} onClick={submit}>
            {busy ? 'Menyimpan…' : 'Catat'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
