import type { Sale } from '@kasir/shared';

/**
 * Pembangun byte ESC/POS untuk printer thermal 58mm (32 kolom) via Web Bluetooth.
 * Murni fungsi — bisa diuji tanpa perangkat.
 */

const ESC = 0x1b;
const GS = 0x1d;

function text(s: string): number[] {
  return [...new TextEncoder().encode(s)];
}

function line(s: string): number[] {
  return [...text(s), 0x0a];
}

/** Baris dua kolom: kiri rata kiri, kanan rata kanan, total 32 kolom. */
export function twoCol(left: string, right: string, width = 32): string {
  const gap = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

export function center(s: string, width = 32): string {
  const pad = Math.max(0, Math.floor((width - s.length) / 2));
  return ' '.repeat(pad) + s + ' '.repeat(Math.max(0, width - s.length - pad));
}

export interface ReceiptPrintData {
  storeName: string;
  sale: Sale;
  cashierName?: string | null;
}

/** Susun byte ESC/POS untuk struk penjualan. */
export function buildReceiptBytes({ storeName, sale, cashierName }: ReceiptPrintData): Uint8Array {
  const out: number[] = [];
  out.push(ESC, 0x40); // init
  out.push(ESC, 0x61, 0x01); // rata tengah
  out.push(GS, 0x21, 0x11); // teks besar
  out.push(...line(storeName.slice(0, 32)));
  out.push(GS, 0x21, 0x00); // normal
  out.push(ESC, 0x61, 0x00); // rata kiri
  out.push(...line(center(sale.receiptNo)));
  out.push(...line(center(new Date(sale.soldAt).toLocaleString('id-ID'))));
  out.push(...line('-'.repeat(32)));
  for (const it of sale.items) {
    const name = it.name.slice(0, 32);
    out.push(...line(name));
    out.push(...line(twoCol(`  ${it.qty} x ${it.unitPrice.toLocaleString('id-ID')}`, ((it.qty * it.unitPrice) - it.discount).toLocaleString('id-ID'))));
  }
  out.push(...line('-'.repeat(32)));
  out.push(...line(twoCol('Total', sale.total.toLocaleString('id-ID'))));
  for (const p of sale.payments) {
    out.push(...line(twoCol(`Bayar (${p.method})`, p.amount.toLocaleString('id-ID'))));
  }
  if (sale.change > 0) out.push(...line(twoCol('Kembali', sale.change.toLocaleString('id-ID'))));
  if (cashierName) out.push(...line(center(`Kasir: ${cashierName}`)));
  out.push(...line(center('Terima kasih')));
  out.push(0x0a, 0x0a, 0x0a);
  out.push(GS, 0x56, 0x00); // potong kertas
  return new Uint8Array(out);
}

/* ------------------------------------------------------------------ */
/* Web Bluetooth                                                       */
/* ------------------------------------------------------------------ */

/** Deklarasi minimal Web Bluetooth (tanpa @types/web-bluetooth). */
interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connect: () => Promise<{
      getPrimaryServices: () => Promise<
        {
          getCharacteristics: () => Promise<
            {
              properties: { write?: boolean; writeWithoutResponse?: boolean };
              writeValueWithResponse: (v: BufferSource) => Promise<void>;
              writeValueWithoutResponse: (v: BufferSource) => Promise<void>;
            }[]
          >;
        }[]
      >;
    }>;
    disconnect: () => void;
  };
}
interface BluetoothLike {
  requestDevice: (opts: {
    filters?: { name?: string }[];
    acceptAllDevices?: boolean;
    optionalServices?: number[];
  }) => Promise<BluetoothDeviceLike>;
}

const PRINTER_SERVICE = 0x1822;

function getBluetooth(): BluetoothLike | undefined {
  return typeof navigator !== 'undefined'
    ? (navigator as Navigator & { bluetooth?: BluetoothLike }).bluetooth
    : undefined;
}

export function isBluetoothSupported(): boolean {
  return !!getBluetooth();
}

const FAVORITE_KEY = 'kasir-printer-favorite';

export function getFavoritePrinter(): string | null {
  try {
    return localStorage.getItem(FAVORITE_KEY);
  } catch {
    return null;
  }
}

function saveFavoritePrinter(name: string): void {
  try {
    localStorage.setItem(FAVORITE_KEY, name);
  } catch {
    // abaikan
  }
}

/**
 * Minta perangkat printer via picker Bluetooth, simpan sebagai favorit.
 * Mengembalikan nama perangkat.
 */
export async function pairPrinter(): Promise<string> {
  const bluetooth = getBluetooth();
  if (!bluetooth) throw new Error('Bluetooth tidak didukung di perangkat ini.');
  const device = (await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [PRINTER_SERVICE, 0x1800, 0x1801],
  })) as BluetoothDeviceLike;
  const name = device.name ?? 'Printer';
  saveFavoritePrinter(name);
  return name;
}

/** Kirim byte struk ke printer yang sudah dipasangkan. */
export async function printReceipt(data: ReceiptPrintData): Promise<void> {
  const bluetooth = getBluetooth();
  if (!bluetooth) throw new Error('Bluetooth tidak didukung di perangkat ini.');
  const favorite = getFavoritePrinter();
  const device = (await bluetooth.requestDevice({
    filters: favorite ? [{ name: favorite }] : undefined,
    acceptAllDevices: !favorite,
    optionalServices: [PRINTER_SERVICE, 0x1800, 0x1801],
  })) as BluetoothDeviceLike;

  const server = await device.gatt!.connect();
  const services = await server.getPrimaryServices();
  // Cari karakteristik tulis pertama yang tersedia.
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    for (const ch of chars) {
      if (ch.properties.write || ch.properties.writeWithoutResponse) {
        const bytes = buildReceiptBytes(data);
        // Kirim per 100 byte agar tidak melampaui MTU.
        for (let i = 0; i < bytes.length; i += 100) {
          const chunk = bytes.slice(i, i + 100);
          if (ch.properties.writeWithoutResponse) {
            await ch.writeValueWithoutResponse(chunk);
          } else {
            await ch.writeValueWithResponse(chunk);
          }
        }
        device.gatt!.disconnect();
        return;
      }
    }
  }
  device.gatt!.disconnect();
  throw new Error('Printer tidak punya karakteristik tulis.');
}
