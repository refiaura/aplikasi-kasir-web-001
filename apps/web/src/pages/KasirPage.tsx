import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Product, Sale, SalePayment, Shift } from '@kasir/shared';
import { Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CashMovementDialog } from '../components/kasir/CashMovementDialog';
import { DiscountDialog } from '../components/kasir/DiscountDialog';
import { OpenBillsDialog } from '../components/kasir/OpenBillsDialog';
import { PayDialog } from '../components/kasir/PayDialog';
import { ReceiptDialog } from '../components/kasir/ReceiptDialog';
import { ShiftDialog } from '../components/kasir/ShiftDialog';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { MoneyText } from '../components/ui/MoneyText';
import { useToast } from '../components/ui/Toast';
import { ApiRequestError, get, post } from '../lib/api';
import { cn } from '../lib/cn';
import { formatRupiah } from '../components/ui/MoneyText';
import { useCart } from '../stores/cart';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function CartPanel({ onCheckout }: { onCheckout: () => void }) {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal)();
  const discountTotal = useCart((s) => s.discountTotal)();
  const total = useCart((s) => s.total)();
  const incQty = useCart((s) => s.incQty);
  const decQty = useCart((s) => s.decQty);
  const removeItem = useCart((s) => s.removeItem);
  const setDiscount = useCart((s) => s.setDiscount);
  const setItemDiscount = useCart((s) => s.setItemDiscount);
  const discountRp = useCart((s) => s.discountRp);
  const discountPct = useCart((s) => s.discountPct);
  const setApprovalPassword = useCart((s) => s.setApprovalPassword);
  const [discTarget, setDiscTarget] = useState<null | { kind: 'txn' } | { kind: 'item'; productId: string; name: string }>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-tinta-muted">Ketuk produk untuk menambah ke keranjang.</p>
        )}
        {items.map((i) => (
          <div key={i.productId} className="rounded-[10px] border border-garis p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm font-bold">{i.name}</p>
              <button
                type="button"
                aria-label={`Hapus ${i.name}`}
                onClick={() => removeItem(i.productId)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-tinta-muted hover:bg-kertas"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Kurangi"
                  onClick={() => decQty(i.productId)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-garis"
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-extrabold tabular-nums">{i.qty}</span>
                <button
                  type="button"
                  aria-label="Tambah"
                  onClick={() => incQty(i.productId)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-garis"
                >
                  <Plus size={16} />
                </button>
              </div>
              <MoneyText value={i.qty * i.price - (i.discountRp > 0 ? Math.min(i.discountRp, i.qty * i.price) : Math.floor((i.qty * i.price * i.discountPct) / 100))} className="font-extrabold tabular-nums" />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDiscTarget({ kind: 'item', productId: i.productId, name: i.name })}
                className="text-xs font-semibold text-pandan-600 hover:underline"
              >
                {i.discountRp > 0 || i.discountPct > 0
                  ? `Diskon: ${i.discountRp > 0 ? formatRupiah(i.discountRp) : `${i.discountPct}%`} (ubah)`
                  : 'Diskon item'}
              </button>
              <span className="text-xs text-tinta-muted tabular-nums">{formatRupiah(i.price)}/{i.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-garis pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-tinta-muted">Subtotal</span>
          <MoneyText value={subtotal} className="tabular-nums" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setDiscTarget({ kind: 'txn' })}
            className="font-semibold text-pandan-600 hover:underline"
          >
            Diskon {discountRp > 0 || discountPct > 0 ? `(${discountRp > 0 ? formatRupiah(discountRp) : `${discountPct}%`})` : ''}
          </button>
          <MoneyText value={discountTotal} className="tabular-nums" />
        </div>
        <div className="flex justify-between py-1 text-xl font-extrabold">
          <span>Total</span>
          <MoneyText value={total} />
        </div>
        <Button size="lg" className="w-full" disabled={items.length === 0} onClick={onCheckout}>
          Bayar
        </Button>
      </div>

      <DiscountDialog
        open={discTarget !== null}
        title={discTarget?.kind === 'item' ? `Diskon — ${discTarget.name}` : 'Diskon transaksi'}
        initialRp={discTarget?.kind === 'item' ? items.find((i) => i.productId === discTarget.productId)?.discountRp : discountRp}
        initialPct={discTarget?.kind === 'item' ? items.find((i) => i.productId === discTarget.productId)?.discountPct : discountPct}
        onClose={() => setDiscTarget(null)}
        onApply={(rp, pct, pw) => {
          if (discTarget?.kind === 'item') setItemDiscount(discTarget.productId, rp, pct);
          else setDiscount(rp, pct);
          setApprovalPassword(pw);
        }}
      />
    </div>
  );
}

export function KasirPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  const [categoryId, setCategoryId] = useState('');
  const [shiftDialog, setShiftDialog] = useState<null | { mode: 'open' | 'close' }>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [billsOpen, setBillsOpen] = useState(false);
  const [cashMoveOpen, setCashMoveOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [paying, setPaying] = useState(false);

  const cartCount = useCart((s) => s.count)();
  const cartTotal = useCart((s) => s.total)();
  const clearCart = useCart((s) => s.clear);
  const addItem = useCart((s) => s.addItem);

  const shiftQuery = useQuery({
    queryKey: ['shift-current'],
    queryFn: () => get<{ shift: Shift | null }>('/shifts/current'),
  });
  const shift = shiftQuery.data?.shift ?? null;

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<{ categories: Category[] }>('/categories'),
  });

  const params = new URLSearchParams();
  if (debouncedQ) params.set('q', debouncedQ);
  if (categoryId) params.set('category_id', categoryId);
  params.set('limit', '100');
  const productsQuery = useQuery({
    queryKey: ['products', debouncedQ, categoryId],
    queryFn: () => get<{ products: Product[]; total: number }>(`/products?${params.toString()}`),
    enabled: !!shift,
  });

  const refreshShift = () => void queryClient.invalidateQueries({ queryKey: ['shift-current'] });

  const checkout = async (payments: SalePayment[], customerId?: string) => {
    const s = useCart.getState();
    setPaying(true);
    try {
      const res = await post<{ sale: Sale }>('/sales', {
        clientTxnId: crypto.randomUUID(),
        items: s.items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          discountRp: i.discountRp,
          discountPct: i.discountPct,
          note: i.note,
        })),
        payments,
        customerId,
        discountRp: s.discountRp,
        discountPct: s.discountPct,
        clientTotal: s.total(),
        approvalPassword: s.approvalPassword ?? undefined,
      });
      clearCart();
      setPayOpen(false);
      setCartOpen(false);
      setReceiptSale(res.sale);
      refreshShift();
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Pembayaran gagal',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    } finally {
      setPaying(false);
    }
  };

  const categories = categoriesQuery.data?.categories ?? [];
  const products = productsQuery.data?.products ?? [];

  return (
    <div className="space-y-4">
      {/* Bilah shift */}
      {shiftQuery.isLoading ? (
        <div className="skeleton h-16" />
      ) : shift ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-garis bg-surface p-4">
          <div>
            <p className="text-sm text-tinta-muted">
              Shift dibuka {new Date(shift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
            </p>
            <p className="font-extrabold tabular-nums">
              Kas diharapkan: <MoneyText value={shift.expectedCash ?? 0} />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setBillsOpen(true)}>
              Pesanan
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCashMoveOpen(true)}>
              Kas masuk/keluar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShiftDialog({ mode: 'close' })}>
              Tutup shift
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-[14px] border border-garis bg-surface p-6 text-center">
          <p className="font-bold">Shift belum dibuka.</p>
          <p className="mb-4 text-sm text-tinta-muted">Buka shift dulu untuk mulai berjualan.</p>
          <Button onClick={() => setShiftDialog({ mode: 'open' })}>Buka shift</Button>
        </section>
      )}

      {shift && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Kiri: produk */}
          <section className="space-y-3">
            <label className="relative block">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tinta-muted" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari produk atau scan barcode…"
                aria-label="Cari produk"
                className="h-12 w-full rounded-[10px] border border-garis bg-surface pl-11 pr-4 text-base placeholder:text-tinta-muted focus:outline-2 focus:outline-pandan-600"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Kategori">
              <button
                type="button"
                onClick={() => setCategoryId('')}
                className={cn(
                  'shrink-0 rounded-[999px] border px-4 py-2 text-sm font-semibold',
                  categoryId === '' ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface text-tinta-muted',
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
                    'shrink-0 rounded-[999px] border px-4 py-2 text-sm font-semibold',
                    categoryId === c.id ? 'border-pandan-600 bg-pandan-50 text-pandan-600' : 'border-garis bg-surface text-tinta-muted',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-28" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addItem(p)}
                    className="flex min-h-[7rem] flex-col items-start justify-between rounded-[14px] border border-garis bg-surface p-3 text-left transition-colors hover:border-pandan-600"
                  >
                    <span className="line-clamp-2 text-sm font-bold leading-tight">{p.name}</span>
                    <span className="mt-2 text-sm font-extrabold tabular-nums text-pandan-600">
                      {formatRupiah(p.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!productsQuery.isLoading && products.length === 0 && (
              <p className="py-8 text-center text-sm text-tinta-muted">Tidak ada produk yang cocok.</p>
            )}
          </section>

          {/* Kanan: keranjang (desktop) */}
          <aside className="hidden rounded-[14px] border border-garis bg-surface p-4 lg:block lg:max-h-[70vh] lg:overflow-hidden">
            <CartPanel onCheckout={() => setPayOpen(true)} />
          </aside>
        </div>
      )}

      {/* Bilah bawah keranjang (mobile) */}
      {shift && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-30 flex h-14 items-center justify-between rounded-[14px] bg-aksi px-5 font-bold text-aksi-text shadow-lg lg:hidden"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart size={20} />
            {cartCount} item
          </span>
          <MoneyText value={cartTotal} />
        </button>
      )}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent title="Keranjang" className="max-h-[85vh]">
          <div className="max-h-[60vh] overflow-y-auto">
            <CartPanel onCheckout={() => setPayOpen(true)} />
          </div>
        </DialogContent>
      </Dialog>

      <ShiftDialog
        open={shiftDialog !== null}
        mode={shiftDialog?.mode ?? 'open'}
        shiftId={shift?.id}
        expectedCash={shift?.expectedCash ?? 0}
        onClose={() => setShiftDialog(null)}
        onDone={refreshShift}
      />
      <PayDialog open={payOpen && !paying} total={cartTotal} onClose={() => setPayOpen(false)} onConfirm={checkout} />
      <ReceiptDialog open={receiptSale !== null} sale={receiptSale} onClose={() => setReceiptSale(null)} />
      <OpenBillsDialog open={billsOpen} onClose={() => setBillsOpen(false)} />
      {shift && (
        <CashMovementDialog
          open={cashMoveOpen}
          shiftId={shift.id}
          onClose={() => setCashMoveOpen(false)}
          onDone={refreshShift}
        />
      )}
    </div>
  );
}
