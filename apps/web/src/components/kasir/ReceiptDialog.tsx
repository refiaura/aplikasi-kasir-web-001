import type { Sale } from '@kasir/shared';
import { useState } from 'react';
import { formatRupiah } from '../ui/MoneyText';
import { useSessionStore } from '../../stores/session';
import { getFavoritePrinter, isBluetoothSupported, pairPrinter, printReceipt } from '../../lib/printer';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';

function receiptText(sale: Sale, storeName: string): string {
  const lines = [
    storeName,
    `No: ${sale.receiptNo}`,
    new Date(sale.soldAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    '--------------------------------',
  ];
  for (const i of sale.items) {
    lines.push(`${i.name} x${i.qty} ${formatRupiah(i.unitPrice * i.qty)}`);
    if (i.discount > 0) lines.push(`  diskon -${formatRupiah(i.discount)}`);
  }
  lines.push('--------------------------------');
  if (sale.discount > 0) lines.push(`Diskon: -${formatRupiah(sale.discount)}`);
  lines.push(`TOTAL: ${formatRupiah(sale.total)}`);
  for (const p of sale.payments) {
    const label = p.method === 'cash' ? 'Tunai' : p.method.toUpperCase();
    lines.push(`${label}: ${formatRupiah(p.amount)}${p.reference ? ` (${p.reference})` : ''}`);
  }
  if (sale.change > 0) lines.push(`Kembalian: ${formatRupiah(sale.change)}`);
  lines.push('Terima kasih!');
  return lines.join('\n');
}

export function ReceiptDialog({
  open,
  sale,
  onClose,
}: {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
}) {
  const store = useSessionStore((s) => s.store);
  const toast = useToast();
  const [printing, setPrinting] = useState(false);
  if (!sale) return null;
  const text = receiptText(sale, store?.name ?? 'Toko');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const favoritePrinter = getFavoritePrinter();

  const handleThermalPrint = async () => {
    setPrinting(true);
    try {
      if (!favoritePrinter) {
        const name = await pairPrinter();
        toast({ kind: 'success', title: 'Printer terhubung', desc: name });
      }
      await printReceipt({ storeName: store?.name ?? 'Toko', sale });
      toast({ kind: 'success', title: 'Struk dikirim ke printer' });
    } catch (e) {
      toast({
        kind: 'error',
        title: 'Gagal mencetak',
        desc: e instanceof Error ? e.message : 'Tidak dapat menghubungi printer.',
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Transaksi berhasil">
        {/* Struk 58mm untuk cetak */}
        <div className="receipt-58 mx-auto bg-white p-3 font-mono text-black">
          <p className="text-center text-sm font-bold">{store?.name ?? 'Toko'}</p>
          <p className="text-center text-xs">{sale.receiptNo}</p>
          <p className="text-center text-xs">
            {new Date(sale.soldAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
          </p>
          <hr className="my-1 border-dashed border-black" />
          {sale.items.map((i, idx) => (
            <div key={idx} className="text-xs">
              <p>{i.name} x{i.qty}</p>
              <p className="flex justify-between">
                <span>
                  {formatRupiah(i.unitPrice)} {i.discount > 0 && `(disc -${formatRupiah(i.discount)})`}
                </span>
                <span>{formatRupiah(i.unitPrice * i.qty - i.discount)}</span>
              </p>
            </div>
          ))}
          <hr className="my-1 border-dashed border-black" />
          <p className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{formatRupiah(sale.total)}</span>
          </p>
          {sale.payments.map((p, idx) => (
            <p key={idx} className="flex justify-between text-xs">
              <span>{p.method === 'cash' ? 'Tunai' : p.method.toUpperCase()}{p.reference ? ` ${p.reference}` : ''}</span>
              <span>{formatRupiah(p.amount)}</span>
            </p>
          ))}
          {sale.change > 0 && (
            <p className="flex justify-between text-xs">
              <span>Kembalian</span>
              <span>{formatRupiah(sale.change)}</span>
            </p>
          )}
          <p className="mt-1 text-center text-xs">Terima kasih!</p>
        </div>

        <div className="mt-4 flex gap-2 no-print">
          <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
            Cetak
          </Button>
          {isBluetoothSupported() && (
            <Button variant="secondary" className="flex-1" disabled={printing} onClick={handleThermalPrint}>
              {printing ? '…' : favoritePrinter ? 'Thermal' : 'Pair printer'}
            </Button>
          )}
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 flex-1 items-center justify-center rounded-[10px] bg-aksi px-5 text-base font-bold text-aksi-text hover:bg-aksi-hover"
          >
            WhatsApp
          </a>
          <Button className="flex-1" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
