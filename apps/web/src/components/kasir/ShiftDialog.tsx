import { useEffect, useState } from 'react';
import { ApiRequestError, post } from '../../lib/api';
import { formatRupiah } from '../ui/MoneyText';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

const PECAHAN = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];

/** Hitung kas fisik per pecahan. */
function DenominationCounter({
  counts,
  setCounts,
}: {
  counts: Record<number, number>;
  setCounts: (c: Record<number, number>) => void;
}) {
  const total = PECAHAN.reduce((s, p) => s + p * (counts[p] ?? 0), 0);
  return (
    <div>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {PECAHAN.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">{formatRupiah(p)}</span>
            <span className="text-tinta-muted">×</span>
            <input
              type="number"
              min={0}
              value={counts[p] ?? 0}
              onChange={(e) =>
                setCounts({ ...counts, [p]: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0) })
              }
              aria-label={`Jumlah pecahan ${formatRupiah(p)}`}
              className="h-11 w-full rounded-[10px] border border-garis bg-surface px-3 text-base tabular-nums focus:outline-2 focus:outline-pandan-600"
            />
            <span className="w-28 shrink-0 text-right text-sm tabular-nums text-tinta-muted">
              {formatRupiah(p * (counts[p] ?? 0))}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-right text-lg font-extrabold tabular-nums">
        Total: {formatRupiah(total)}
      </p>
    </div>
  );
}

interface ShiftDialogProps {
  open: boolean;
  mode: 'open' | 'close';
  expectedCash?: number;
  shiftId?: string;
  onClose: () => void;
  onDone: () => void;
}

export function ShiftDialog({ open, mode, expectedCash, shiftId, onClose, onDone }: ShiftDialogProps) {
  const toast = useToast();
  const [openingCash, setOpeningCash] = useState('');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setOpeningCash('');
      setCounts({});
      setNote('');
    }
  }, [open ]);

  const countedCash = PECAHAN.reduce((s, p) => s + p * (counts[p] ?? 0), 0);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'open') {
        const value = Number.parseInt(openingCash || '0', 10) || 0;
        await post('/shifts/open', { openingCash: value });
        toast({ kind: 'success', title: 'Shift dibuka', desc: `Kas awal ${formatRupiah(value)}.` });
      } else {
        await post(`/shifts/${shiftId}/close`, { countedCash, note: note || undefined });
        const selisih = countedCash - (expectedCash ?? 0);
        toast({
          kind: selisih === 0 ? 'success' : 'info',
          title: 'Shift ditutup',
          desc: `Selisih ${selisih >= 0 ? '+' : '−'}${formatRupiah(Math.abs(selisih)).replace('Rp', 'Rp')}.`,
        });
      }
      onDone();
      onClose();
    } catch (e) {
      toast({
        kind: 'error',
        title: mode === 'open' ? 'Gagal membuka shift' : 'Gagal menutup shift',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={mode === 'open' ? 'Buka shift' : 'Tutup shift'}>
        {mode === 'open' ? (
          <div className="space-y-4">
            <Input
              label="Kas awal di laci (Rp)"
              type="number"
              min={0}
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="mis. 100000"
            />
            <div className="flex flex-wrap gap-2">
              {[50000, 100000, 200000, 500000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOpeningCash(String(v))}
                  className="rounded-[999px] border border-garis bg-surface px-4 py-2 text-sm font-semibold hover:bg-kertas"
                >
                  {formatRupiah(v)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-tinta-muted">
              Kas yang diharapkan: <span className="font-extrabold text-tinta tabular-nums">{formatRupiah(expectedCash ?? 0)}</span>
            </p>
            <DenominationCounter counts={counts} setCounts={setCounts} />
            <Input label="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
        <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={submit}>
          {busy ? 'Menyimpan…' : mode === 'open' ? 'Buka shift' : 'Tutup shift'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
