import { productSeedSchema, type SeedBusinessType } from '@kasir/shared';
import { useState } from 'react';
import { ApiRequestError, post } from '../../lib/api';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { useToast } from '../ui/Toast';

const OPTIONS: { value: SeedBusinessType; title: string; desc: string }[] = [
  { value: 'kelontong', title: 'Warung kelontong', desc: 'Sembako, makanan, minuman, kebersihan' },
  { value: 'kedai', title: 'Kedai kopi / makanan', desc: 'Menu kopi, non-kopi, dan makanan' },
  { value: 'bangunan', title: 'Toko bangunan', desc: 'Semen, cat, perkakas, listrik' },
];

export function SeedDialog({
  open,
  onClose,
  onSeeded,
}: {
  open: boolean;
  onClose: () => void;
  onSeeded: () => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<SeedBusinessType>('kelontong');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = productSeedSchema.safeParse({ businessType: selected });
    if (!parsed.success) return;
    setBusy(true);
    try {
      const res = await post<{ categories: number; products: number }>('/products/seed', parsed.data);
      toast({
        kind: 'success',
        title: 'Contoh produk ditambahkan',
        desc: `${res.products} produk dalam ${res.categories} kategori.`,
      });
      onSeeded();
      onClose();
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal menambahkan contoh',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Isi contoh produk">
        <p className="mb-4 text-sm text-tinta-muted">
          Pilih jenis usahamu. Kategori dan produk contoh akan dibuat beserta stok awalnya.
        </p>
        <div className="space-y-2" role="radiogroup" aria-label="Jenis usaha">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected === o.value}
              onClick={() => setSelected(o.value)}
              className={cn(
                'w-full rounded-[10px] border p-4 text-left transition-colors duration-150',
                selected === o.value ? 'border-pandan-600 bg-pandan-50' : 'border-garis bg-surface hover:bg-kertas',
              )}
            >
              <p className="font-bold text-tinta">{o.title}</p>
              <p className="text-sm text-tinta-muted">{o.desc}</p>
            </button>
          ))}
        </div>
        <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={submit}>
          {busy ? 'Menambahkan…' : 'Tambahkan contoh'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
