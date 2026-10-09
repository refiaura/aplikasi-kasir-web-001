import type { SalePayment } from '@kasir/shared';
import { useEffect, useMemo, useState } from 'react';
import { formatRupiah } from '../ui/MoneyText';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';

type Method = 'cash' | 'qris' | 'transfer';

const TABS: { id: Method | 'split'; label: string }[] = [
  { id: 'cash', label: 'Tunai' },
  { id: 'qris', label: 'QRIS' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'split', label: 'Gabungan' },
];

interface SplitRow {
  id: number;
  method: Method;
  amount: string;
  cashReceived: string;
  reference: string;
}

function quickCashOptions(total: number): number[] {
  const opts = new Set<number>([total]);
  for (const p of [20000, 50000, 100000, 200000]) if (p >= total) opts.add(p);
  // Bulatkan ke atas ke 50rb berikutnya
  opts.add(Math.ceil(total / 50000) * 50000 || 50000);
  return [...opts].sort((a, b) => a - b).slice(0, 5);
}

export function PayDialog({
  open,
  total,
  onClose,
  onConfirm,
}: {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payments: SalePayment[]) => void;
}) {
  const [tab, setTab] = useState<Method | 'split'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [rowId, setRowId] = useState(1);

  useEffect(() => {
    if (open) {
      setTab('cash');
      setCashReceived('');
      setReference('');
      setSplitRows([]);
      setRowId(1);
    }
  }, [open ]);

  const cashNum = Number.parseInt(cashReceived || '0', 10) || 0;
  const change = cashNum - total;

  const splitTotal = useMemo(
    () => splitRows.reduce((s, r) => s + (Number.parseInt(r.amount || '0', 10) || 0), 0),
    [splitRows],
  );
  const splitValid =
    splitRows.length > 0 &&
    splitTotal === total &&
    splitRows.every((r) => {
      const amt = Number.parseInt(r.amount || '0', 10) || 0;
      if (amt <= 0) return false;
      if (r.method === 'cash') {
        const cr = Number.parseInt(r.cashReceived || '0', 10) || 0;
        return cr >= amt;
      }
      return r.reference.trim().length > 0;
    });

  const confirm = () => {
    if (tab === 'cash') {
      onConfirm([{ method: 'cash', amount: total, cashReceived: cashNum }]);
    } else if (tab === 'split') {
      onConfirm(
        splitRows.map((r) => ({
          method: r.method,
          amount: Number.parseInt(r.amount || '0', 10) || 0,
          cashReceived: r.method === 'cash' ? Number.parseInt(r.cashReceived || '0', 10) || 0 : null,
          reference: r.method === 'cash' ? null : r.reference.trim() || null,
        })),
      );
    } else {
      onConfirm([{ method: tab, amount: total, reference: reference.trim() }]);
    }
  };

  const singleValid =
    tab === 'cash' ? cashNum >= total && total > 0 : reference.trim().length > 0 && total > 0;

  const addSplitRow = () => {
    setSplitRows((rows) => [...rows, { id: rowId, method: 'cash', amount: '', cashReceived: '', reference: '' }]);
    setRowId((x) => x + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Bayar" className="max-h-[90vh] overflow-y-auto">
        <p className="mb-4 text-center text-3xl font-extrabold tabular-nums">{formatRupiah(total)}</p>

        <div className="mb-4 flex gap-2" role="tablist" aria-label="Metode pembayaran">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 rounded-[10px] border px-2 py-3 text-sm font-bold',
                tab === t.id ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'cash' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {quickCashOptions(total).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCashReceived(String(v))}
                  className={cn(
                    'rounded-[999px] border px-4 py-2 text-sm font-bold tabular-nums',
                    cashNum === v ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface',
                  )}
                >
                  {v === total ? 'Uang pas' : formatRupiah(v)}
                </button>
              ))}
            </div>
            <Input
              label="Uang diterima (Rp)"
              type="number"
              min={0}
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
            />
            <p className={cn('text-center text-lg font-extrabold tabular-nums', change < 0 ? 'text-cabai-600' : 'text-pandan-600')}>
              Kembalian: {formatRupiah(Math.max(0, change))}
              {change < 0 && <span className="block text-sm font-semibold">Kurang {formatRupiah(-change)}</span>}
            </p>
          </div>
        )}

        {(tab === 'qris' || tab === 'transfer') && (
          <div className="space-y-3">
            <Input
              label={tab === 'qris' ? 'Nomor referensi QRIS' : 'Nomor referensi transfer'}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="mis. QR123456"
            />
            <p className="text-sm text-tinta-muted">
              Pastikan dana {formatRupiah(total)} sudah masuk sebelum menekan Bayar.
            </p>
          </div>
        )}

        {tab === 'split' && (
          <div className="space-y-3">
            {splitRows.map((r) => (
              <div key={r.id} className="rounded-[10px] border border-garis p-3">
                <div className="mb-2 flex gap-2">
                  {(['cash', 'qris', 'transfer'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSplitRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, method: m } : x)))}
                      className={cn(
                        'flex-1 rounded-[8px] border px-2 py-2 text-xs font-bold capitalize',
                        r.method === m ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Hapus baris"
                    onClick={() => setSplitRows((rows) => rows.filter((x) => x.id !== r.id))}
                    className="rounded-[8px] border border-garis px-3 text-cabai-600"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Nominal (Rp)"
                    type="number"
                    min={0}
                    value={r.amount}
                    onChange={(e) => setSplitRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, amount: e.target.value } : x)))}
                  />
                  {r.method === 'cash' ? (
                    <Input
                      label="Diterima (Rp)"
                      type="number"
                      min={0}
                      value={r.cashReceived}
                      onChange={(e) => setSplitRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, cashReceived: e.target.value } : x)))}
                    />
                  ) : (
                    <Input
                      label="No. referensi"
                      value={r.reference}
                      onChange={(e) => setSplitRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, reference: e.target.value } : x)))}
                    />
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSplitRow}
              className="w-full rounded-[10px] border border-dashed border-garis py-3 text-sm font-bold text-tinta-muted hover:bg-kertas"
            >
              + Tambah pembayaran
            </button>
            <p className={cn('text-center font-extrabold tabular-nums', splitTotal === total ? 'text-pandan-600' : 'text-tinta-muted')}>
              Terkumpul {formatRupiah(splitTotal)} / {formatRupiah(total)}
            </p>
          </div>
        )}

        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={tab === 'split' ? !splitValid : !singleValid}
          onClick={confirm}
        >
          Bayar {formatRupiah(total)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
