import { zodResolver } from '@hookform/resolvers/zod';
import { stockMovementSchema, type Product, type StockMovementInput } from '@kasir/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiRequestError, post } from '../../lib/api';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

interface StockDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product | null;
  mode: 'in' | 'adjust';
}

export function StockDialog({ open, onClose, onSaved, product, mode }: StockDialogProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: { productId: product?.id ?? '', type: mode === 'in' ? 'purchase' : 'adjustment' },
  });

  useEffect(() => {
    if (open) {
      reset({ productId: product?.id ?? '', type: mode === 'in' ? 'purchase' : 'adjustment' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id, mode]);

  const onSubmit = async (values: StockMovementInput) => {
    try {
      await post('/stock/movements', values);
      toast({
        kind: 'success',
        title: mode === 'in' ? 'Stok masuk tercatat' : 'Penyesuaian tercatat',
      });
      onSaved();
      onClose();
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal mencatat mutasi stok',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={mode === 'in' ? `Stok masuk — ${product?.name}` : `Penyesuaian — ${product?.name}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label={mode === 'in' ? 'Jumlah masuk' : 'Selisih (+/-)'}
            type="number"
            hint={mode === 'in' ? 'Angka positif.' : 'Negatif bila berkurang, mis. -2.'}
            error={errors.qty?.message}
            {...register('qty', { valueAsNumber: true })}
          />
          {mode === 'in' && (
            <Input
              label="Harga modal per satuan (Rp, opsional)"
              type="number"
              min={0}
              hint="Bila diisi, harga modal produk ikut diperbarui."
              error={errors.unitCost?.message}
              {...register('unitCost', { valueAsNumber: true })}
            />
          )}
          <Input
            label={mode === 'in' ? 'Catatan (opsional)' : 'Alasan (wajib)'}
            placeholder={mode === 'in' ? 'mis. Kulakan mingguan' : 'mis. Opname: selisih 2'}
            error={errors.note?.message}
            {...register('note')}
          />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan…' : 'Catat'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
