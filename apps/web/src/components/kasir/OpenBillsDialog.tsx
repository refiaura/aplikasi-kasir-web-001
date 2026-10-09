import type { OpenBill } from '@kasir/shared';
import { useEffect, useState } from 'react';
import { deleteOpenBill, listOpenBills, useCart } from '../../stores/cart';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { saveOpenBill } from '../../stores/cart';

export function OpenBillsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const loadBill = useCart((s) => s.loadBill);
  const clear = useCart((s) => s.clear);
  const [bills, setBills] = useState<OpenBill[]>([]);
  const [name, setName] = useState('');

  const refresh = async () => setBills(await listOpenBills());

  useEffect(() => {
    if (open) {
      setName('');
      void refresh();
    }
  }, [open ]);

  const save = async () => {
    try {
      await saveOpenBill(name);
      clear();
      toast({ kind: 'success', title: 'Pesanan disimpan' });
      void refresh();
      setName('');
    } catch (e) {
      toast({ kind: 'error', title: 'Gagal menyimpan', desc: e instanceof Error ? e.message : undefined });
    }
  };

  const resume = async (bill: OpenBill) => {
    loadBill(bill);
    await deleteOpenBill(bill.id);
    toast({ kind: 'success', title: `Pesanan "${bill.name}" dibuka` });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Pesanan tersimpan">
        <div className="mb-4 flex gap-2">
          <Input
            label="Nama pesanan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. Meja 3"
          />
          <Button className="mt-auto shrink-0" onClick={save}>
            Simpan
          </Button>
        </div>
        {bills.length === 0 ? (
          <p className="py-4 text-center text-sm text-tinta-muted">Belum ada pesanan tersimpan di perangkat ini.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {bills.map((b) => (
              <li key={b.id} className="flex items-center gap-2 rounded-[10px] border border-garis p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{b.name}</p>
                  <p className="text-sm text-tinta-muted">
                    {b.items.reduce((s, i) => s + i.qty, 0)} item ·{' '}
                    {new Date(b.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void resume(b)}>
                  Buka
                </Button>
                <button
                  type="button"
                  aria-label={`Hapus ${b.name}`}
                  onClick={() => void deleteOpenBill(b.id).then(refresh)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] text-cabai-600 hover:bg-kertas"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
