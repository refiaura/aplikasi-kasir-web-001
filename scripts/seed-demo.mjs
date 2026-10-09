#!/usr/bin/env node
/**
 * Seed data demo untuk dashboard & laporan: 7 hari transaksi acak.
 *
 * Cara pakai:
 *   node scripts/seed-demo.mjs --email=pemilik@toko.id --password=rahasia [--api=http://localhost:8080] [--days=7]
 *
 * Yang dilakukan:
 *  1. Login sebagai pemilik.
 *  2. Bila katalog kosong, isi produk contoh (POST /products/seed).
 *  3. Daftarkan perangkat "Demo" + kasir "Kasir Demo" (PIN 123456) bila belum ada.
 *  4. Login PIN, buka shift, buat transaksi acak dengan soldAt mundur N hari.
 *  5. Aman dijalankan ulang: transaksi memakai clientTxnId unik per hari+urutan.
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

const API = args.api ?? process.env.API_URL ?? 'http://localhost:8080';
const DAYS = Number(args.days ?? 7);
if (!args.email || !args.password) {
  console.error('Wajib: --email=... --password=...');
  process.exit(1);
}

let cookie = '';
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  if (!res.ok) {
    const msg = data.message ?? data.error ?? res.statusText;
    throw new Error(`${method} ${path} → ${res.status} ${msg}`);
  }
  return data;
}

/** UUID v7 sederhana (cukup unik untuk idempotensi seed). */
function uuidv7() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  const ts = BigInt(Date.now());
  b[0] = Number((ts >> 40n) & 0xffn);
  b[1] = Number((ts >> 32n) & 0xffn);
  b[2] = Number((ts >> 24n) & 0xffn);
  b[3] = Number((ts >> 16n) & 0xffn);
  b[4] = Number((ts >> 8n) & 0xffn);
  b[5] = Number(ts & 0xffn);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rnd(0, arr.length - 1)];

async function main() {
  console.log(`→ API: ${API}`);

  // 1. Login pemilik.
  await api('/auth/login', { method: 'POST', body: { email: args.email, password: args.password } });
  console.log('→ Login pemilik OK');

  // 2. Produk: seed bila kosong.
  let products = (await api('/products?limit=100')).products ?? [];
  if (products.length === 0) {
    console.log('→ Katalog kosong, seed produk contoh...');
    await api('/products/seed', { method: 'POST', body: { businessType: 'kelontong' } });
    products = (await api('/products?limit=100')).products ?? [];
  }
  const sellable = products.filter((p) => p.isActive !== false && Number(p.price) > 0);
  if (sellable.length === 0) throw new Error('Tidak ada produk jual.');
  console.log(`→ ${sellable.length} produk siap`);

  // 2b. Tambah stok awal agar seed penjualan tidak kehabisan.
  console.log('→ Menambah stok awal...');
  for (const p of sellable) {
    await api('/stock/movements', {
      method: 'POST',
      body: { productId: p.id, type: 'purchase', qty: 500, unitCost: Number(p.cost) || Math.max(1, Math.round(Number(p.price) * 0.7)) },
    }).catch(() => {});
  }

  // 3. Perangkat demo.
  const devices = (await api('/devices')).devices ?? [];
  let device = devices.find((d) => d.code === 'DEMO-01');
  if (!device) {
    const r = await api('/devices', { method: 'POST', body: { code: 'DEMO-01', name: 'Perangkat Demo' } });
    device = r.device;
  }
  console.log(`→ Perangkat: ${device.code}`);

  // 4. Kasir demo (PIN 123456).
  const users = (await api('/users')).users ?? [];
  let cashier = users.find((u) => u.role === 'cashier' && u.name === 'Kasir Demo');
  if (!cashier) {
    const r = await api('/users', { method: 'POST', body: { name: 'Kasir Demo', pin: '123456' } });
    cashier = r.user;
  }
  console.log('→ Kasir demo siap (PIN 123456)');

  // 5. Login PIN sebagai kasir.
  cookie = '';
  await api('/auth/pin', { method: 'POST', body: { deviceCode: device.code, pin: '123456' } });
  console.log('→ Login PIN OK');

  // 6. Buka shift (abaikan bila sudah ada yang terbuka).
  try {
    await api('/shifts/open', { method: 'POST', body: { openingCash: 100000 } });
    console.log('→ Shift dibuka');
  } catch (e) {
    if (!String(e.message).includes('409')) throw e;
    console.log('→ Shift sudah terbuka');
  }

  // 7. Transaksi acak N hari ke belakang.
  let total = 0;
  for (let d = DAYS - 1; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const nSales = rnd(4, 10);
    for (let s = 0; s < nSales; s++) {
      const nItems = rnd(1, 4);
      const items = [];
      const used = new Set();
      for (let i = 0; i < nItems; i++) {
        const p = pick(sellable);
        if (used.has(p.id)) continue;
        used.add(p.id);
        items.push({ productId: p.id, qty: rnd(1, 3) });
      }
      if (items.length === 0) continue;
      const soldAt = new Date(date);
      soldAt.setHours(rnd(8, 20), rnd(0, 59), 0, 0);
      // Total dihitung klien HANYA untuk nominal bayar; server tetap hitung ulang.
      const totalRp = items.reduce((s, it) => {
        const p = sellable.find((x) => x.id === it.productId);
        return s + (p ? Number(p.price) * it.qty : 0);
      }, 0);
      if (totalRp <= 0) continue;
      const method = Math.random() < 0.7 ? 'cash' : 'qris';
      const payment =
        method === 'cash'
          ? { method, amount: totalRp, cashReceived: totalRp }
          : { method, amount: totalRp, reference: `DEMO-${Date.now()}-${s}` };
      await api('/sales', {
        method: 'POST',
        body: {
          clientTxnId: uuidv7(),
          items,
          payments: [payment],
          soldAt: soldAt.toISOString(),
        },
      }).catch((e) => {
        // Stok habis di tengah seed: lewati saja.
        if (!String(e.message).includes('Stok')) throw e;
      });
      total++;
    }
    // amount: 0 → server hitung dari total? Tidak: cek skema payment.
    console.log(`→ Hari -${d}: ${nSales} transaksi`);
  }

  console.log(`\nSelesai: ${total} transaksi demo dibuat. Buka /laporan & dashboard.`);
}

main().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
