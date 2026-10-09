import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Product } from '@kasir/shared';
import { Archive, PackagePlus, Pencil, Plus, Search, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductDialog } from '../components/products/ProductDialog';
import { SeedDialog } from '../components/products/SeedDialog';
import { StockDialog } from '../components/products/StockDialog';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { MoneyText } from '../components/ui/MoneyText';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { ApiRequestError, get, patch } from '../lib/api';
import { cn } from '../lib/cn';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

function StockBadge({ product }: { product: Product }) {
  if (!product.trackStock) return null;
  if (product.stockQty < 0) {
    return (
      <span className="rounded-[999px] bg-cabai-600/10 px-2.5 py-1 text-xs font-bold text-cabai-600">
        Minus {product.stockQty}
      </span>
    );
  }
  if (product.lowStock) {
    return (
      <span className="rounded-[999px] bg-kunyit-50 px-2.5 py-1 text-xs font-bold text-tinta">
        Stok tinggal {product.stockQty}
      </span>
    );
  }
  return <span className="text-sm font-semibold tabular-nums">{product.stockQty}</span>;
}

export function ProductsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  const [categoryId, setCategoryId] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [productDialog, setProductDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [stockDialog, setStockDialog] = useState<{
    open: boolean;
    product: Product | null;
    mode: 'in' | 'adjust';
  }>({ open: false, product: null, mode: 'in' });
  const [seedOpen, setSeedOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, categoryId, lowStockOnly]);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<{ categories: Category[] }>('/categories'),
  });

  const params = new URLSearchParams();
  if (debouncedQ) params.set('q', debouncedQ);
  if (categoryId) params.set('category_id', categoryId);
  if (lowStockOnly) params.set('low_stock', '1');
  params.set('page', String(page));
  params.set('limit', '50');

  const productsQuery = useQuery({
    queryKey: ['products', debouncedQ, categoryId, lowStockOnly, page],
    queryFn: () => get<ProductsResponse>(`/products?${params.toString()}`),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => patch(`/products/${id}`, { isActive: false }),
    onSuccess: () => {
      setDeactivateTarget(null);
      refresh();
      toast({ kind: 'success', title: 'Produk dinonaktifkan' });
    },
    onError: (e) => {
      toast({
        kind: 'error',
        title: 'Gagal menonaktifkan produk',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    },
  });

  const categories = categoriesQuery.data?.categories ?? [];
  const data = productsQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        desc={data ? `${data.total} produk` : 'Memuat…'}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSeedOpen(true)}>
              <Sparkles size={18} />
              Isi contoh
            </Button>
            <Button onClick={() => setProductDialog({ open: true, product: null })}>
              <Plus size={18} />
              Tambah produk
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="max-w-md">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama produk…"
            aria-label="Cari produk"
            leading={<Search size={18} />}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
          <button
            type="button"
            onClick={() => setCategoryId('')}
            className={cn(
              'rounded-[999px] border px-4 py-2 text-sm font-semibold transition-colors duration-150',
              categoryId === '' ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface text-tinta-muted hover:bg-kertas',
            )}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={cn(
                'rounded-[999px] border px-4 py-2 text-sm font-semibold transition-colors duration-150',
                categoryId === c.id ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface text-tinta-muted hover:bg-kertas',
              )}
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLowStockOnly((v) => !v)}
            aria-pressed={lowStockOnly}
            className={cn(
              'rounded-[999px] border px-4 py-2 text-sm font-semibold transition-colors duration-150',
              lowStockOnly ? 'border-kunyit-500 bg-kunyit-50 text-tinta' : 'border-garis bg-surface text-tinta-muted hover:bg-kertas',
            )}
          >
            Stok menipis
          </button>
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      ) : !data || data.products.length === 0 ? (
        <section className="rounded-[14px] border border-garis bg-surface p-8 text-center">
          <p className="text-base font-semibold">Belum ada produk.</p>
          <p className="mt-1 text-sm text-tinta-muted">
            Isi dengan contoh sesuai jenis usahamu, atau tambah manual satu per satu.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => setSeedOpen(true)}>
              <Sparkles size={18} />
              Isi contoh
            </Button>
            <Button onClick={() => setProductDialog({ open: true, product: null })}>
              <Plus size={18} />
              Tambah produk
            </Button>
          </div>
        </section>
      ) : (
        <ul className="divide-y divide-garis rounded-[14px] border border-garis bg-surface">
          {data.products.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-garis bg-kertas">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <PackagePlus size={20} className="text-tinta-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.name}</p>
                <p className="truncate text-sm text-tinta-muted">
                  {[p.sku, p.categoryName].filter(Boolean).join(' · ') || p.unit}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <MoneyText value={p.price} className="font-bold" />
                <p className="text-xs text-tinta-muted">/{p.unit}</p>
              </div>
              <div className="w-28 text-right">
                <StockBadge product={p} />
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  title="Stok masuk"
                  aria-label={`Stok masuk ${p.name}`}
                  onClick={() => setStockDialog({ open: true, product: p, mode: 'in' })}
                  className="flex h-12 w-12 items-center justify-center rounded-[10px] text-pandan-600 hover:bg-pandan-50"
                >
                  <TrendingUp size={18} />
                </button>
                <button
                  type="button"
                  title="Penyesuaian stok"
                  aria-label={`Sesuaikan stok ${p.name}`}
                  onClick={() => setStockDialog({ open: true, product: p, mode: 'adjust' })}
                  className="flex h-12 w-12 items-center justify-center rounded-[10px] text-tinta-muted hover:bg-kertas"
                >
                  <TrendingDown size={18} />
                </button>
                <button
                  type="button"
                  title="Ubah"
                  aria-label={`Ubah ${p.name}`}
                  onClick={() => setProductDialog({ open: true, product: p })}
                  className="flex h-12 w-12 items-center justify-center rounded-[10px] text-tinta-muted hover:bg-kertas"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  title="Nonaktifkan"
                  aria-label={`Nonaktifkan ${p.name}`}
                  onClick={() => setDeactivateTarget(p)}
                  className="flex h-12 w-12 items-center justify-center rounded-[10px] text-tinta-muted hover:bg-kertas"
                >
                  <Archive size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm font-semibold tabular-nums">
            {page} / {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((x) => x + 1)}>
            Berikutnya
          </Button>
        </div>
      )}

      <ProductDialog
        open={productDialog.open}
        product={productDialog.product}
        categories={categories}
        onClose={() => setProductDialog({ open: false, product: null })}
        onSaved={refresh}
      />
      <StockDialog
        open={stockDialog.open}
        product={stockDialog.product}
        mode={stockDialog.mode}
        onClose={() => setStockDialog({ open: false, product: null, mode: 'in' })}
        onSaved={refresh}
      />
      <SeedDialog open={seedOpen} onClose={() => setSeedOpen(false)} onSeeded={refresh} />

      <Dialog open={!!deactivateTarget} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <DialogContent title="Nonaktifkan produk?">
          <p className="text-sm text-tinta-muted">
            <span className="font-bold text-tinta">{deactivateTarget?.name}</span> tidak akan muncul di
            daftar, tapi riwayatnya tetap tersimpan.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeactivateTarget(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
            >
              Nonaktifkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
