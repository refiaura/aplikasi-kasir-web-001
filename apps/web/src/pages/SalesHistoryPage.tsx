import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Sale } from '@kasir/shared';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { ApiRequestError, get, post } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { MoneyText, formatRupiah } from '../components/ui/MoneyText';
import { ReceiptDialog } from '../components/kasir/ReceiptDialog';
import { useToast } from '../components/ui/Toast';
import { useSessionStore } from '../stores/session';
import { cn } from '../lib/cn';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';

interface SaleListItem {
  id: string;
  receiptNo: string;
  total: number;
  status: string;
  cashierName: string | null;
  soldAt: string;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  kasbon: 'Kasbon',
  other: 'Lainnya',
};

export function SalesHistoryPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const isOwner = user?.role === 'owner';
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [approvalPassword, setApprovalPassword] = useState('');

  const listQ = useQuery({
    queryKey: ['sales', page],
    queryFn: () => get<{ sales: SaleListItem[]; total: number; page: number; pages: number }>(`/sales?page=${page}&limit=20`),
  });
  const detailQ = useQuery({
    queryKey: ['sales', 'detail', selectedId],
    queryFn: () => get<{ sale: Sale }>(`/sales/${selectedId}`),
    enabled: selectedId !== null,
  });

  const doVoid = async () => {
    if (!selectedId) return;
    try {
      await post(`/sales/${selectedId}/void`, {
        reason: voidReason,
        approvalPassword: isOwner ? undefined : approvalPassword || undefined,
      });
      setVoidOpen(false);
      setVoidReason('');
      setApprovalPassword('');
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ kind: 'success', title: 'Transaksi dibatalkan' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal membatalkan',
        desc: e instanceof ApiRequestError ? e.message : 'Tidak dapat menghubungi server.',
      });
    }
  };

  const sale = detailQ.data?.sale;
  const items = listQ.data?.sales ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Riwayat transaksi"
        desc={isOwner ? 'Semua perangkat.' : 'Perangkat ini.'}
      />

      {listQ.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Belum ada transaksi"
          desc="Transaksi yang dibuat akan tercatat di sini."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-[14px] border border-garis bg-surface p-4 text-left hover:border-pandan-600',
                  s.status !== 'completed' && 'opacity-60',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-bold tabular-nums">{s.receiptNo}</p>
                  <p className="text-sm text-tinta-muted">
                    {new Date(s.soldAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                    {s.cashierName ? ` · ${s.cashierName}` : ''}
                    {s.status !== 'completed' ? ' · Dibatalkan' : ''}
                  </p>
                </div>
                <MoneyText value={s.total} className="shrink-0 font-extrabold tabular-nums" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={selectedId !== null} onOpenChange={(v) => { if (!v) setSelectedId(null); }}>
        <DialogContent title="Detail transaksi">
          {detailQ.isLoading || !sale ? (
            <div className="skeleton h-40" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-extrabold tabular-nums">{sale.receiptNo}</p>
                {sale.status === 'completed' ? (
                  <span className="rounded-[999px] bg-pandan-50 px-3 py-1 text-xs font-bold text-pandan-600">Selesai</span>
                ) : (
                  <span className="rounded-[999px] bg-kunyit-50 px-3 py-1 text-xs font-bold text-kunyit-700">Dibatalkan</span>
                )}
              </div>
              <ul className="space-y-1 text-sm">
                {sale.items.map((it) => (
                  <li key={it.productId} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">{it.name} <span className="text-tinta-muted">×{it.qty}</span></span>
                    <MoneyText value={it.unitPrice * it.qty - it.discount} className="shrink-0 font-semibold tabular-nums" />
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-garis pt-3 text-sm">
                <div className="flex justify-between"><span className="text-tinta-muted">Subtotal</span><MoneyText value={sale.subtotal} className="tabular-nums" /></div>
                <div className="flex justify-between"><span className="text-tinta-muted">Diskon</span><span className="tabular-nums">−{formatRupiah(sale.discount)}</span></div>
                <div className="flex justify-between font-extrabold"><span>Total</span><MoneyText value={sale.total} className="tabular-nums" /></div>
                <div className="flex justify-between"><span className="text-tinta-muted">Kembali</span><MoneyText value={sale.change} className="tabular-nums" /></div>
                <div className="flex justify-between"><span className="text-tinta-muted">Bayar</span><span className="text-right">{sale.payments.map((p) => `${METHOD_LABEL[p.method] ?? p.method} ${formatRupiah(p.amount)}`).join(' + ')}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setReceiptOpen(true)}>Cetak ulang</Button>
                {sale.status === 'completed' && (
                  <Button variant="danger" onClick={() => setVoidOpen(true)}>Batalkan</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {sale && (
        <ReceiptDialog open={receiptOpen} sale={sale} onClose={() => setReceiptOpen(false)} />
      )}

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent title="Batalkan transaksi">
          <div className="space-y-4">
            <p className="text-sm text-tinta-muted">
              Stok dikembalikan, kasbon dibalik, dan kas shift dikoreksi. Tindakan ini dicatat.
            </p>
            <Input label="Alasan" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="mis. salah input" />
            {!isOwner && (
              <Input label="Kata sandi pemilik" type="password" value={approvalPassword} onChange={(e) => setApprovalPassword(e.target.value)} />
            )}
            <Button variant="danger" size="lg" className="w-full" disabled={voidReason.trim().length < 3 || (!isOwner && approvalPassword.length === 0)} onClick={doVoid}>
              Batalkan transaksi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {(listQ.data?.pages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm tabular-nums text-tinta-muted">{page} / {listQ.data!.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= listQ.data!.pages} onClick={() => setPage(page + 1)}>
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
