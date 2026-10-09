import { zodResolver } from '@hookform/resolvers/zod';
import {
  productCreateSchema,
  productUpdateSchema,
  type Category,
  type Product,
  type ProductCreateInput,
  type ProductUpdateInput,
} from '@kasir/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiRequestError, patch, post } from '../../lib/api';
import { compressToWebP, uploadImage } from '../../lib/image';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  product?: Product | null;
}

type CreateForm = ProductCreateInput;
type UpdateForm = ProductUpdateInput;

export function ProductDialog({ open, onClose, onSaved, categories, product }: ProductDialogProps) {
  const isEdit = !!product;
  const toast = useToast();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(product?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm | UpdateForm>({
    resolver: zodResolver(isEdit ? productUpdateSchema : productCreateSchema),
    defaultValues: isEdit
      ? {
          name: product?.name ?? '',
          categoryId: product?.categoryId ?? null,
          sku: product?.sku ?? '',
          barcode: product?.barcode ?? '',
          unit: product?.unit ?? 'pcs',
          price: product?.price ?? 0,
          cost: product?.cost ?? 0,
          trackStock: product?.trackStock ?? true,
          minStock: product?.minStock ?? 0,
        }
      : { unit: 'pcs', trackStock: true },
  });

  useEffect(() => {
    if (open) {
      setPhotoFile(null);
      setPhotoPreview(product?.imageUrl ?? null);
      reset(
        isEdit
          ? {
              name: product?.name ?? '',
              categoryId: product?.categoryId ?? null,
              sku: product?.sku ?? '',
              barcode: product?.barcode ?? '',
              unit: product?.unit ?? 'pcs',
              price: product?.price ?? 0,
              cost: product?.cost ?? 0,
              trackStock: product?.trackStock ?? true,
              minStock: product?.minStock ?? 0,
            }
          : { unit: 'pcs', trackStock: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const cleanPayload = (v: CreateForm | UpdateForm) => {
    const out: Record<string, unknown> = { ...v };
    if (out.sku === '') out.sku = null;
    if (out.barcode === '') out.barcode = null;
    if (out.categoryId === '') out.categoryId = null;
    return out;
  };

  const onSubmit = async (values: CreateForm | UpdateForm) => {
    setUploading(true);
    try {
      let imageUrl = product?.imageUrl ?? null;
      if (photoFile) {
        const webp = await compressToWebP(photoFile);
        imageUrl = await uploadImage(webp);
      }
      const payload = { ...cleanPayload(values), imageUrl };
      if (isEdit) {
        await patch(`/products/${product!.id}`, payload);
        toast({ kind: 'success', title: 'Produk diperbarui' });
      } else {
        await post('/products', payload);
        toast({ kind: 'success', title: 'Produk ditambahkan' });
      }
      onSaved();
      onClose();
    } catch (e) {
      toast({
        kind: 'error',
        title: isEdit ? 'Gagal memperbarui produk' : 'Gagal menambah produk',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    } finally {
      setUploading(false);
    }
  };

  const busy = isSubmitting || uploading;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title={isEdit ? 'Ubah produk' : 'Tambah produk'} className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Nama produk" error={errors.name?.message} {...register('name')} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pd-kategori" className="text-sm font-semibold text-tinta">
              Kategori
            </label>
            <select
              id="pd-kategori"
              className="h-12 rounded-[10px] border border-garis bg-surface px-4 text-base text-tinta focus:outline-2 focus:outline-offset-1 focus:outline-pandan-600"
              {...register('categoryId')}
            >
              <option value="">Tanpa kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU (opsional)" error={errors.sku?.message} {...register('sku')} />
            <Input label="Barcode (opsional)" error={errors.barcode?.message} {...register('barcode')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Satuan" error={errors.unit?.message} {...register('unit')} />
            <Input
              label="Harga jual (Rp)"
              type="number"
              min={0}
              error={errors.price?.message}
              {...register('price', { valueAsNumber: true })}
            />
            <Input
              label="Harga modal (Rp)"
              type="number"
              min={0}
              error={errors.cost?.message}
              {...register('cost', { valueAsNumber: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!isEdit && (
              <Input
                label="Stok awal"
                type="number"
                min={0}
                hint="Dicatat sebagai stok masuk."
                error={(errors as { initialStock?: { message?: string } }).initialStock?.message}
                {...register('initialStock', { valueAsNumber: true })}
              />
            )}
            <Input
              label="Stok minimum"
              type="number"
              min={0}
              hint="Peringatan saat stok ≤ angka ini."
              error={errors.minStock?.message}
              {...register('minStock', { valueAsNumber: true })}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-garis bg-surface px-4 py-3">
            <input type="checkbox" className="h-5 w-5 accent-[#1f6f5c]" {...register('trackStock')} />
            <span className="text-sm font-semibold">Lacak stok produk ini</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-tinta">Foto (opsional)</span>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-20 w-20 items-center justify-center overflow-hidden rounded-[10px] border border-garis bg-kertas text-sm text-tinta-muted',
                )}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Pratinjau foto produk" className="h-full w-full object-cover" />
                ) : (
                  'Belum ada'
                )}
              </div>
              <label className="cursor-pointer rounded-[10px] border border-garis bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-kertas">
                Pilih foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <p className="text-sm text-tinta-muted">Dikompres otomatis ke WebP di perangkat.</p>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Tambah produk'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
