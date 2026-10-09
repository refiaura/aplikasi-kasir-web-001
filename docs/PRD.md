# PRD Aplikasi Kasir UMKM

Oct 8, 2026 · @ISAL GL

Aplikasi kasir web (PWA) untuk warung, kedai, dan toko kecil: transaksi selesai di bawah 10 detik, tetap jalan saat internet putus, dan laporan harian yang langsung dipahami pemilik.

## 1. Ringkasan

**Masalah.** Banyak UMKM masih mencatat penjualan dan stok secara manual, sehingga stok tidak sinkron, uang kas selisih, dan pemilik tidak tahu untung sebenarnya. Aplikasi kasir yang ada sering terlalu rumit, mahal per cabang, atau mati saat sinyal jelek.

**Target pengguna.** Usaha mikro dan kecil dengan 1 outlet, 1–3 kasir: warung kelontong, kedai kopi/makanan, toko bangunan kecil, laundry, konter pulsa.

**Tujuan produk**

1. Kasir baru bisa transaksi pertama dalam 5 menit setelah daftar, tanpa pelatihan.
2. Satu transaksi 3 item selesai ≤ 10 detik (scan/ketuk → bayar → struk).
3. Pemilik melihat omzet, laba kotor, dan stok menipis dalam satu layar.
4. Tetap bisa transaksi tanpa internet; sinkron otomatis saat online.

**Ukuran keberhasilan (3 bulan setelah rilis)**

| Metrik | Target |
| --- | --- |
| Waktu ke transaksi pertama | ≤ 5 menit (median) |
| Toko aktif mingguan (≥ 20 transaksi/minggu) | ≥ 60% dari toko terdaftar |
| Transaksi offline yang gagal sinkron | < 0,1% |
| Selisih kas saat tutup shift | turun ≥ 50% vs catatan manual (survei pilot) |
| Kepuasan (skor 1–5) | ≥ 4,3 |

## 2. Hasil riset

Kebutuhan inti UMKM konsisten di berbagai studi: catat transaksi, pantau stok, laporan harian–bulanan, dan bisa jalan tanpa internet. Dua perubahan regulasi 2026 membuka peluang fitur pembeda.

### Temuan → implikasi fitur

| Temuan | Bukti | Implikasi untuk produk |
| --- | --- | --- |
| Pencatatan manual bikin stok tidak sinkron, kehabisan atau kelebihan barang | Studi Kasir Pintar di toko kelontong ([PNJ](https://prosiding.pnj.ac.id/index.php/SNAM/article/download/5433/3134/27242)) | Stok berkurang otomatis per transaksi + peringatan stok menipis |
| Aplikasi populer masih bergantung internet, antarmuka rumit, belum dukung printer thermal & ekspor CSV | Riset Excash ([SENTRINOV](https://proceeding.isas.or.id/index.php/sentrinov/article/view/1714/1122)) | PWA offline-first, cetak ESC/POS, impor/ekspor CSV |
| Pemilik butuh pemasukan per hari, bulan, tahun dan riwayat transaksi | Studi RidhoQua ([IT Telkom PWT](https://repository.ittelkom-pwt.ac.id/11149/4/BAB%20V.pdf)) | Dashboard ringkas + filter rentang tanggal |
| UMKM butuh lihat saldo per metode bayar (tunai, QRIS, transfer, ojol) | Modul keuangan POS Marikh ([Politap](https://jurnal.politap.ac.id/index.php/literasi/article/download/1307/843/6791)) | Laporan per metode bayar + rekap kas per shift |
| Kasbon pelanggan umum di warung; offline jadi fitur jualan | Fitur Qasir ([Gizmologi](https://gizmologi.id/news/qasir-umkm/)) | Modul Kasbon (hutang pelanggan) masuk MVP |
| Pembeli ingin aplikasi sederhana, murah, fokus transaksi–stok–laporan | Kloa, Rp24.750/bln ([Beritajatim](https://beritajatim.com/?p=1496487)) | Jaga fitur inti tetap sedikit; harga murah |

### Regulasi yang memengaruhi desain

- **QRIS MDR 0%.** Mulai 1 Oktober 2026, MDR QRIS 0% untuk transaksi ≤ Rp100.000 di semua kategori merchant, dan ≤ Rp500.000 untuk Usaha Mikro ([BI via Investor Daily](https://achmadnurhidayat.id/bank-indonesia-bebaskan-tarif-mdr-qris)). 96,68% dari 44,86 juta merchant QRIS adalah UMKM. Implikasi: QRIS wajib jadi metode bayar kelas satu, bukan tambahan.
- **Keamanan QRIS.** BI mengingatkan verifikasi nama merchant karena modus QRIS palsu ([UKM Indonesia](https://ukmindonesia.id/baca-deskripsi-posts/qris-makin-mendunia-isu-keamanan-dan-biaya-admin-masih-dipertanyakan-publik)). Implikasi: tampilkan nama merchant besar di layar QRIS; konfirmasi pembayaran manual wajib dicentang kasir.
- **PP 20/2026 (PPh Final UMKM).** Tarif 0,5% tetap untuk omzet ≤ Rp4,8 miliar/tahun; orang pribadi bebas PPh untuk omzet ≤ Rp500 juta, dan 0,5% hanya dikenakan atas kelebihannya; PT dan CV non-perorangan tidak lagi bisa memakai skema ini ([Pajakku](https://pajakku.com/artikel/aturan-pajak-umkm-yang-masih-berlaku-dalam-pp-202026), [IKPI](https://ikpi.or.id/pp-20-tahun-2026-berakhirnya-era-tarif-final-05-persen-bagi-cv-dan-pt-apakah-selalu-merugikan/)). Implikasi: fitur **Pantau Omzet Pajak** — bar omzet kumulatif tahun berjalan vs batas Rp500 juta dan Rp4,8 miliar, plus estimasi PPh bulanan. Fitur ini informatif, bukan nasihat pajak.

### Peta kompetitor & posisi

| Aplikasi | Harga mulai | Catatan |
| --- | --- | --- |
| Kloa | Rp24.750/bln | Fokus fitur inti, murah |
| Kasir Pintar Pro | Rp55.000/bln | Versi gratis ada; tanpa biaya per cabang |
| Olsera | Rp128.000/bln | Omnichannel, CRM |
| Pawoon Basic | Rp149.000/bln | Versi gratis terbatas 7 transaksi/hari |
| Majoo Starter | Rp149.000/bln | Fitur sangat lengkap (absensi, CRM) |
| Moka | Rp299.000/bln/cabang | Populer untuk F&B, retail |

Harga dari [HitPay](https://blog.hitpayapp.com/pos-system-indonesia-comparison) dan [HitPay ID](https://hitpayapp.com/blog/sistem-aplikasi-pos-gratis-di-indonesia); bisa berubah. **Posisi kita:** sesederhana Kloa, tapi berbasis web (jalan di HP, tablet, laptop tanpa install), offline-first, dengan Kasbon dan Pantau Omzet Pajak sebagai pembeda.

## 3. Persona

| Persona | Konteks | Kebutuhan utama | Frustrasi |
| --- | --- | --- | --- |
| **Bu Sari**, pemilik warung kelontong, 45 th | 1 HP Android, sinyal naik-turun, 300+ SKU, banyak pelanggan langganan | Cari barang cepat, catat kasbon, tahu stok habis | Aplikasi penuh menu, huruf kecil, harus online |
| **Dimas**, pemilik kedai kopi, 28 th | Tablet + printer thermal Bluetooth, 2 barista bergantian | Varian (ukuran, gula), shift per kasir, laporan per menu | Selisih kas antar shift, struk lambat |
| **Rina**, kasir paruh waktu, 20 th | Pakai perangkat toko, ganti kasir pakai PIN | Layar jelas, tombol besar, tidak takut salah | Tidak bisa batalkan item tanpa panggil pemilik |

Prinsip yang diturunkan: tombol minimal 48px, angka besar, bahasa sehari-hari ("Uang diterima", bukan "Tender"), dan setiap aksi berisiko bisa dibatalkan atau minta PIN pemilik.

## 4. Ruang lingkup fitur

MVP (P0) cukup untuk menggantikan buku catatan dan kalkulator; P1 masuk sebelum rilis publik; P2 setelah ada pengguna aktif.

| Modul | Fitur | Prioritas |
| --- | --- | --- |
| Akun & toko | Daftar dengan nomor HP/email, profil toko (nama, alamat, logo, footer struk), wizard onboarding 3 langkah | P0 |
| Pengguna | Peran Pemilik & Kasir, login kasir dengan PIN 6 digit, hak akses (diskon, void, lihat laporan) | P0 |
| Produk | CRUD produk, kategori, harga jual & modal, SKU/barcode, foto, satuan (pcs, kg, bungkus) | P0 |
| Produk | Varian & add-on (ukuran, topping), harga grosir bertingkat | P1 |
| Produk | Impor/ekspor CSV, template contoh | P1 |
| Stok | Stok berkurang otomatis, stok masuk (pembelian), penyesuaian/opname, batas stok minimum + notifikasi | P0 |
| Stok | Riwayat mutasi stok per produk | P1 |
| Kasir (POS) | Grid produk + pencarian + scan barcode (scanner USB & kamera), keranjang, ubah qty, catatan item | P0 |
| Kasir (POS) | Diskon per item / per transaksi (nominal / %), simpan pesanan (open bill) | P0 |
| Pembayaran | Tunai (tombol uang pas & pecahan cepat, hitung kembalian), QRIS statis milik toko, transfer, split payment | P0 |
| Pembayaran | QRIS dinamis via payment gateway dengan konfirmasi otomatis (webhook) | P2 |
| Struk | Cetak thermal 58/80mm (Bluetooth/USB, ESC/POS), fallback print browser, kirim struk via WhatsApp | P0 |
| Shift & kas | Buka shift (modal awal), kas masuk/keluar, tutup shift dengan hitung uang fisik & selisih | P0 |
| Transaksi | Riwayat, cari, void/refund dengan alasan + PIN pemilik | P0 |
| Kasbon | Catat hutang pelanggan, bayar sebagian, pengingat via WhatsApp | P0 |
| Pelanggan | Daftar pelanggan (nama, HP), riwayat belanja | P1 |
| Laporan | Dashboard hari ini, omzet & laba kotor per periode, produk terlaris, per metode bayar, per kasir | P0 |
| Laporan | Ekspor PDF/Excel, pengeluaran operasional, laba bersih sederhana | P1 |
| Pajak | Pantau Omzet Pajak (kumulatif vs Rp500 jt & Rp4,8 M, estimasi PPh final 0,5%) | P1 |
| Offline | PWA installable, transaksi offline + antrean sinkron | P0 |
| Lanjutan | Multi-outlet, loyalti/poin, integrasi ojol & marketplace, meja untuk F&B | P2 |

**Di luar cakupan:** akuntansi double-entry penuh, penggajian, e-Faktur, dan pembuatan laporan pajak resmi.

## 5. Alur utama

**Alur kasir harian**

1. **Masuk** — kasir memilih namanya, ketik PIN.
2. **Buka shift** — isi modal awal laci (mis. Rp200.000). Shift sebelumnya yang belum ditutup memblokir langkah ini.
3. **Tambah item** — ketuk produk, cari, atau scan. Ketuk ulang = qty +1; tahan = ubah qty/catatan/diskon.
4. **Bayar** — pilih metode:
   - Tunai: tombol "Uang pas", Rp20rb, Rp50rb, Rp100rb, atau ketik; kembalian tampil besar.
   - QRIS: tampil QR toko + nama merchant + total besar; kasir centang "Sudah masuk" setelah cek notifikasi.
   - Transfer / split: pilih rekening, atau bagi nominal ke dua metode.
   - Kasbon: pilih/buat pelanggan, transaksi tercatat sebagai hutang.
5. **Selesai** — struk tercetak otomatis (jika printer terhubung) + tombol "Kirim WA". Keranjang kosong, siap pelanggan berikutnya.
6. **Tutup shift** — hitung uang fisik per pecahan; sistem tampilkan kas seharusnya, selisih, dan rekap per metode bayar.

**Alur pemilik:** onboarding (nama toko → tambah 3 produk pertama atau impor CSV → tes transaksi) → dashboard harian → stok menipis → catat stok masuk → laporan bulanan.

**Alur offline:** transaksi disimpan lokal dengan ID unik dari perangkat → badge "3 belum terkirim" di header → saat online, antrean dikirim berurutan; server menolak duplikat berdasarkan ID tersebut.

## 6. Desain UI

Arah visual: **"toko yang rapi"** — hangat seperti kertas nota, tenang seperti daun pandan, dengan satu aksen kunyit untuk hal yang penting. Bukan gradasi ungu, bukan kartu kaca, bukan ilustrasi 3D generik.

### Prinsip

1. **Angka adalah pahlawan.** Total, kembalian, dan omzet memakai ukuran terbesar di layar dan angka tabular agar digit tidak bergeser.
2. **Satu layar, satu tugas.** Layar kasir tidak punya sidebar menu; navigasi ke laporan lewat tombol di header.
3. **Jempol dulu.** Di HP, tombol "Bayar" menempel di bawah; area sentuh ≥ 48px; jarak antar tombol ≥ 8px.
4. **Warna punya arti.** Hijau = aksi utama & sukses, kunyit = perlu perhatian (stok menipis, belum sinkron), merah = hanya untuk hapus/void.
5. **Bahasa warung.** "Uang diterima", "Kembalian", "Stok tinggal 3", "Kasbon" — tanpa istilah akuntansi.
6. **Tenang saat error.** Pesan menjelaskan apa yang terjadi dan langkah berikutnya; data tidak pernah hilang diam-diam.

### Palet warna

| Token | Light | Dark | Dipakai untuk |
| --- | --- | --- | --- |
| `pandan-600` (primary) | `#1F6F5C` | `#4FB39A` | Tombol Bayar, tab aktif, link |
| `pandan-700` | `#165546` | `#6CC7AF` | Hover/pressed primary |
| `pandan-50` | `#E7F2EE` | `#16302A` | Latar item terpilih, badge sukses |
| `kunyit-500` (aksen) | `#E3A23B` | `#F0B85C` | Stok menipis, belum sinkron, highlight angka penting |
| `kunyit-50` | `#FCF3E3` | `#33280F` | Latar banner peringatan |
| `cabai-600` (bahaya) | `#C2412D` | `#F07A64` | Void, hapus, selisih minus |
| `kertas` (latar app) | `#F7F5F0` | `#121412` | Latar halaman |
| `surface` | `#FFFFFF` | `#1B1E1B` | Kartu, panel keranjang |
| `garis` | `#E4E0D6` | `#2C302C` | Border, pemisah |
| `tinta` (teks) | `#1F201C` | `#ECEBE6` | Teks utama |
| `tinta-muted` | `#6B6A62` | `#A3A29A` | Label, teks sekunder |

Semua pasangan teks/latar harus lolos kontras WCAG AA (≥ 4,5:1); `kunyit-500` hanya untuk ikon/latar, bukan teks di atas putih. Gunakan warna netral hangat (bukan abu dingin) agar terasa ramah.

### Tipografi & bentuk

- **Font:** Plus Jakarta Sans (dirancang di Indonesia, gratis di Google Fonts) untuk seluruh UI; `font-variant-numeric: tabular-nums` untuk semua harga.
- **Skala:** 12 / 14 / 16 (body) / 20 / 24 / 32 / 48 (total & kembalian).
- **Radius:** 10px tombol & input, 14px kartu, 999px badge. **Bayangan:** hampir tidak ada — pisahkan dengan border `garis` dan latar `kertas`.
- **Ikon:** Lucide, stroke 1.75, 20px.
- **Format uang:** `Rp12.500` (titik ribuan, tanpa desimal), negatif `−Rp5.000` berwarna cabai.
- **Gerak:** 150–200ms ease-out; item masuk keranjang "meluncur" singkat; tidak ada animasi di layar laporan.

### Layar kunci

| Layar | Tata letak tablet/laptop | Tata letak HP |
| --- | --- | --- |
| Kasir | Kiri 65%: pencarian + chip kategori + grid produk (foto/inisial, nama, harga). Kanan 35%: keranjang, subtotal, diskon, tombol Bayar besar | Grid produk penuh; bar bawah menempel "3 item · Rp45.000 → Bayar"; keranjang muncul sebagai bottom sheet |
| Pembayaran | Modal tengah: total 48px, tab metode, keypad & tombol pecahan, kembalian menyala hijau | Layar penuh dengan keypad di bawah |
| Struk/selesai | Tanda centang, kembalian, tombol Cetak · WA · Transaksi baru | Sama, tombol bertumpuk |
| Dashboard pemilik | Kartu: Omzet hari ini, Laba kotor, Jumlah transaksi, Kasbon belum lunas; grafik 7 hari; daftar stok menipis | Kartu ditumpuk, grafik digeser horizontal |
| Produk | Tabel dengan pencarian, filter kategori, edit inline harga & stok | Daftar kartu + tombol tambah mengambang |
| Tutup shift | Form hitung per pecahan, ringkasan kas seharusnya vs fisik | Sama, satu kolom |

**Empty state** pakai kalimat + satu aksi ("Belum ada produk. Tambah produk pertama"), tanpa ilustrasi besar. **Skeleton loading** mengikuti bentuk konten, bukan spinner.

## 7. Arsitektur & stack

Monorepo TypeScript dengan satu API dan satu PWA; PostgreSQL sebagai sumber kebenaran, IndexedDB di perangkat sebagai cache dan antrean offline.

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Monorepo | pnpm workspaces: `apps/web`, `apps/api`, `packages/shared` | Tipe & skema Zod dipakai bersama FE–BE |
| Frontend | React 19 + TypeScript + Vite | Sesuai permintaan; build cepat |
| Routing | TanStack Router | Type-safe, code-splitting per halaman |
| Data server | TanStack Query | Cache, retry, sinkron saat online |
| State lokal | Zustand (keranjang, shift aktif) | Ringan, mudah dipersist |
| Form & validasi | React Hook Form + Zod | Skema sama dengan API |
| UI | Tailwind CSS v4 + Radix primitives (komponen dibuat sendiri dari token di bagian 6) | Aksesibel, tidak terlihat "template" |
| Offline | vite-plugin-pwa (Workbox) + Dexie (IndexedDB) | Shell app & data produk tersedia offline |
| Grafik | Recharts | Cukup untuk dashboard |
| Barcode | Scanner USB (input keyboard) + kamera via BarcodeDetector, fallback ZXing | Tanpa hardware tambahan |
| Printer | Web Bluetooth / WebUSB + encoder ESC/POS; fallback `window.print()` CSS 58/80mm | Struk langsung dari browser Chrome Android |
| Backend | Node.js 22 + Fastify + TypeScript | Cepat, schema-first |
| ORM & migrasi | Drizzle ORM + drizzle-kit | SQL eksplisit, tipe dari skema |
| Database | PostgreSQL 16 | Transaksi ACID, row-level lock untuk stok |
| Auth | Sesi cookie httpOnly (pemilik) + PIN kasir per perangkat terdaftar; hash Argon2id | Aman, tanpa token di localStorage |
| File | Object storage S3-compatible (foto produk, logo, QR) | Murah, CDN |
| Job | pg-boss (antrean di Postgres) | Pengingat kasbon, laporan terjadwal tanpa Redis |
| Deploy | Docker; API + Postgres di VPS lokal (mis. region Jakarta), web di CDN | Latensi rendah, biaya kecil |
| Observability | Sentry (FE/BE) + log JSON pino + uptime check | Tahu error sebelum pengguna lapor |
| Test | Vitest, Testing Library, Playwright (alur kasir end-to-end) | Alur uang wajib teruji |

### Desain offline & sinkron

- Produk, kategori, pelanggan, dan pengaturan toko di-cache di IndexedDB; diperbarui dengan `GET /sync?since=<cursor>` (delta berdasarkan `updated_at`).
- Transaksi dibuat di klien dengan `client_txn_id` (UUID v7) dan nomor nota lokal `PERANGKAT-YYMMDD-0001`.
- Antrean dikirim berurutan ke `POST /sales`; server memakai `client_txn_id` sebagai kunci idempotensi (UNIQUE), jadi kirim ulang aman.
- Stok boleh minus sementara saat offline; server mencatat mutasi apa adanya dan dashboard menandai produk minus untuk diperiksa.
- Konflik edit produk: aturan "server menang" + catatan di log aktivitas.

### Aturan uang

Semua nominal disimpan sebagai `BIGINT` rupiah (tanpa desimal, tanpa float). Pembulatan diskon persen: ke bawah ke rupiah terdekat. Total dihitung ulang di server; nilai dari klien hanya dibandingkan.

## 8. Skema database PostgreSQL

Setiap tabel bisnis membawa `store_id` (multi-tenant satu database); semua query wajib difilter `store_id` dari sesi, bukan dari body request. Stok adalah hasil penjumlahan `stock_movements`, dengan kolom cache `products.stock_qty` yang diperbarui dalam transaksi yang sama.

```sql
CREATE TYPE user_role AS ENUM ('owner', 'cashier');
CREATE TYPE pay_method AS ENUM ('cash', 'qris', 'transfer', 'kasbon', 'other');
CREATE TYPE sale_status AS ENUM ('completed', 'voided', 'refunded');
CREATE TYPE move_type AS ENUM ('sale', 'purchase', 'adjustment', 'void', 'refund');

CREATE TABLE stores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  address       text,
  phone         text,
  logo_url      text,
  qris_image_url text,
  receipt_footer text,
  business_type text NOT NULL DEFAULT 'retail',  -- retail | fnb | jasa
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id),
  name        text NOT NULL,
  email       citext UNIQUE,
  phone       text UNIQUE,
  password_hash text,              -- pemilik
  pin_hash    text,                -- kasir
  role        user_role NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',  -- {discount:true, void:false, reports:false}
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON users (store_id);

CREATE TABLE devices (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id),
  code       text NOT NULL,         -- prefix nomor nota, mis. 'K1'
  name       text NOT NULL,
  last_seen_at timestamptz,
  UNIQUE (store_id, code)
);

CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id),
  name       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (store_id, name)
);

CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id),
  category_id uuid REFERENCES categories(id),
  name        text NOT NULL,
  sku         text,
  barcode     text,
  unit        text NOT NULL DEFAULT 'pcs',
  price       bigint NOT NULL CHECK (price >= 0),
  cost        bigint NOT NULL DEFAULT 0 CHECK (cost >= 0),
  track_stock boolean NOT NULL DEFAULT true,
  stock_qty   numeric(12,3) NOT NULL DEFAULT 0,
  min_stock   numeric(12,3) NOT NULL DEFAULT 0,
  image_url   text,
  is_active   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, barcode),
  UNIQUE (store_id, sku)
);
CREATE INDEX ON products (store_id, updated_at);
CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE product_variants (           -- P1
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       text NOT NULL,              -- 'Large', 'Less sugar'
  price_delta bigint NOT NULL DEFAULT 0
);

CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id),
  name       text NOT NULL,
  phone      text,
  kasbon_balance bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON customers (store_id, name);

CREATE TABLE shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id),
  device_id     uuid NOT NULL REFERENCES devices(id),
  opened_by     uuid NOT NULL REFERENCES users(id),
  closed_by     uuid REFERENCES users(id),
  opening_cash  bigint NOT NULL,
  expected_cash bigint,
  counted_cash  bigint,
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz
);
CREATE UNIQUE INDEX one_open_shift_per_device ON shifts (device_id) WHERE closed_at IS NULL;

CREATE TABLE cash_movements (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id  uuid NOT NULL REFERENCES shifts(id),
  amount    bigint NOT NULL,             -- + masuk, - keluar
  note      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id),
  client_txn_id uuid NOT NULL UNIQUE,    -- kunci idempotensi dari perangkat
  receipt_no    text NOT NULL,
  shift_id      uuid NOT NULL REFERENCES shifts(id),
  cashier_id    uuid NOT NULL REFERENCES users(id),
  customer_id   uuid REFERENCES customers(id),
  subtotal      bigint NOT NULL,
  discount      bigint NOT NULL DEFAULT 0,
  total         bigint NOT NULL CHECK (total >= 0),
  cost_total    bigint NOT NULL,         -- untuk laba kotor
  status        sale_status NOT NULL DEFAULT 'completed',
  void_reason   text,
  sold_at       timestamptz NOT NULL,    -- waktu di perangkat
  synced_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, receipt_no)
);
CREATE INDEX ON sales (store_id, sold_at DESC);

CREATE TABLE sale_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id),
  name_snapshot text NOT NULL,
  qty         numeric(12,3) NOT NULL CHECK (qty > 0),
  unit_price  bigint NOT NULL,
  unit_cost   bigint NOT NULL,
  discount    bigint NOT NULL DEFAULT 0,
  note        text
);
CREATE INDEX ON sale_items (sale_id);
CREATE INDEX ON sale_items (product_id);

CREATE TABLE payments (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id   uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method    pay_method NOT NULL,
  amount    bigint NOT NULL CHECK (amount > 0),
  cash_received bigint,                  -- hanya tunai
  reference text                         -- no. ref QRIS/transfer
);
CREATE INDEX ON payments (sale_id);

CREATE TABLE kasbon_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  sale_id     uuid REFERENCES sales(id),
  amount      bigint NOT NULL,           -- + hutang, - pembayaran
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON kasbon_entries (customer_id, created_at);

CREATE TABLE stock_movements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id),
  product_id uuid NOT NULL REFERENCES products(id),
  type       move_type NOT NULL,
  qty        numeric(12,3) NOT NULL,      -- + masuk, - keluar
  unit_cost  bigint,
  ref_id     uuid,                        -- sale_id / purchase id
  note       text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON stock_movements (product_id, created_at DESC);

CREATE TABLE expenses (                   -- P1
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id  uuid NOT NULL REFERENCES stores(id),
  category  text NOT NULL,
  amount    bigint NOT NULL CHECK (amount > 0),
  spent_on  date NOT NULL,
  note      text
);

CREATE TABLE audit_logs (
  id        bigserial PRIMARY KEY,
  store_id  uuid NOT NULL,
  user_id   uuid,
  action    text NOT NULL,              -- 'sale.void', 'product.price_change'
  payload   jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Catatan implementasi:

- Ekstensi wajib: `pgcrypto`, `citext`, `pg_trgm` (pencarian nama produk yang toleran salah ketik).
- `POST /sales` berjalan dalam satu transaksi: insert `sales` → `sale_items` → `payments` → `stock_movements` → update `products.stock_qty` → (jika kasbon) `kasbon_entries` + `customers.kasbon_balance`.
- Void tidak menghapus baris: status jadi `voided` dan dibuat mutasi stok balik bertipe `void`.
- Laporan harian memakai zona waktu toko (default `Asia/Jakarta`); simpan `timestamptz`, konversi saat agregasi.

## 9. Endpoint API inti

REST JSON di bawah `/api/v1`, divalidasi dengan Zod dari `packages/shared`. Error memakai format `{ code, message, details }` dengan pesan berbahasa Indonesia.

| Method & path | Fungsi | Akses |
| --- | --- | --- |
| `POST /auth/register` | Daftar pemilik + buat toko | Publik |
| `POST /auth/login` · `POST /auth/logout` | Sesi pemilik | Publik / sesi |
| `POST /auth/pin` | Ganti kasir aktif di perangkat terdaftar | Perangkat |
| `GET /sync?since=` | Delta produk, kategori, pelanggan, pengaturan | Kasir |
| `GET/POST/PATCH /products` | Kelola produk; `?q=` cari, `?low_stock=1` | Pemilik (kasir: baca) |
| `POST /products/import` | Impor CSV (dry-run dulu, lalu commit) | Pemilik |
| `POST /stock/movements` | Stok masuk / penyesuaian / opname | Pemilik |
| `POST /shifts` · `POST /shifts/:id/close` | Buka/tutup shift | Kasir |
| `POST /shifts/:id/cash` | Kas masuk/keluar | Kasir |
| `POST /sales` | Buat transaksi (idempoten via `client_txn_id`) | Kasir |
| `POST /sales/batch` | Kirim antrean offline (maks 50) | Kasir |
| `POST /sales/:id/void` | Batalkan transaksi (alasan + PIN pemilik) | Pemilik |
| `GET /sales` · `GET /sales/:id` | Riwayat + detail struk | Kasir (milik shift) / Pemilik |
| `GET/POST /customers` | Pelanggan | Kasir |
| `POST /customers/:id/kasbon-payments` | Bayar kasbon | Kasir |
| `GET /reports/summary?from=&to=` | Omzet, laba kotor, transaksi, per metode bayar | Pemilik |
| `GET /reports/top-products` · `/by-cashier` | Produk terlaris, kinerja kasir | Pemilik |
| `GET /reports/tax-tracker?year=` | Omzet kumulatif & estimasi PPh final | Pemilik |
| `GET /reports/export?type=&format=` | PDF/XLSX | Pemilik |

## 10. Kebutuhan non-fungsional

| Aspek | Target |
| --- | --- |
| Kecepatan | Layar kasir interaktif < 2 detik di HP Android kelas bawah (RAM 3GB, 4G); tambah item ke keranjang < 50ms; `POST /sales` p95 < 300ms |
| Ukuran | Bundle JS awal layar kasir < 200KB gzip; foto produk dikompres ke WebP ≤ 80KB |
| Offline | Transaksi tanpa batas jumlah selama offline; data tersimpan walau browser ditutup |
| Ketersediaan | Uptime API 99,5%/bulan; backup Postgres harian + PITR 7 hari |
| Keamanan | HTTPS wajib, cookie `Secure; HttpOnly; SameSite=Lax`, rate limit login & PIN (5 percobaan → kunci 5 menit), setiap query terisolasi `store_id`, audit log untuk void & ubah harga |
| Privasi | Patuh UU PDP: data pelanggan minimal (nama, HP), fitur ekspor & hapus akun |
| Aksesibilitas | WCAG 2.1 AA, navigasi keyboard penuh di layar kasir (F2 cari, Enter bayar, Esc batal) |
| Perangkat | Chrome/Edge Android & desktop 2 versi terakhir, Safari iOS 17+ (tanpa Web Bluetooth → print browser) |
| Bahasa | Bahasa Indonesia; string dipisah (i18n-ready) |

## 11. Tahapan pengembangan

Estimasi 16 minggu untuk 1–2 developer full-stack sampai rilis publik; setiap fase punya kriteria selesai yang bisa diuji, bukan sekadar "fitur jadi".

| Fase | Minggu | Hasil | Kriteria selesai |
| --- | --- | --- | --- |
| 0. Discovery & desain | 1–2 | Wawancara, wireframe, design system | 5 UMKM menyelesaikan uji prototipe kasir tanpa bantuan |
| 1. Fondasi | 3–4 | Monorepo, auth, toko, DB, CI/CD | Pemilik daftar → login → lihat dashboard kosong di staging |
| 2. Produk & stok | 5–6 | CRUD produk, kategori, stok masuk, opname | 300 produk tampil & dicari < 100ms |
| 3. Kasir & pembayaran | 7–9 | POS, keranjang, bayar, struk, shift | Transaksi 3 item ≤ 10 detik; tutup shift tanpa selisih di uji |
| 4. Laporan & kasbon | 10–11 | Dashboard, laporan, kasbon, riwayat & void | Angka laporan = jumlah manual dari 100 transaksi uji |
| 5. Offline & perangkat | 12–13 | PWA, antrean sinkron, printer, scanner | 200 transaksi offline tersinkron tanpa duplikat |
| 6. Pilot & QA | 14–15 | Uji di 5–10 toko nyata, perbaikan | Tidak ada bug P0/P1 terbuka; skor kepuasan ≥ 4 |
| 7. Rilis | 16 | Produksi, landing page, onboarding | Monitoring aktif, backup teruji restore |

### Fase 0 — Discovery & desain (minggu 1–2)

- [ ] Wawancara 8 pelaku UMKM (2 kelontong, 2 F&B, 2 toko lain, 2 yang pernah berhenti pakai aplikasi kasir)
- [ ] Catat alur nyata: cara hitung kembalian, kapan kasbon, cara cek stok
- [ ] Wireframe 6 layar kunci (bagian 6), uji klik dengan prototipe Figma
- [ ] Finalkan token warna, tipografi, komponen dasar (Button, Input, Sheet, Dialog, Toast, NumberPad, MoneyText)
- [ ] Putuskan pertanyaan terbuka di bagian 12

### Fase 1 — Fondasi (minggu 3–4)

- [ ] Setup pnpm monorepo, ESLint, Prettier, TypeScript strict, Vitest
- [ ] Docker Compose lokal: Postgres 16 + API + web
- [ ] Migrasi awal Drizzle: `stores`, `users`, `devices`, `audit_logs`
- [ ] Auth pemilik (register, login, sesi cookie), registrasi perangkat, PIN kasir
- [ ] Middleware isolasi `store_id` + test bahwa toko A tidak bisa membaca data toko B
- [ ] Layout app, routing, tema light/dark dari token
- [ ] CI: lint, typecheck, test, build; deploy otomatis ke staging

### Fase 2 — Produk & stok (minggu 5–6)

- [ ] Tabel `categories`, `products`, `stock_movements`
- [ ] Halaman produk: tabel, cari (pg\_trgm), filter, edit inline harga & stok
- [ ] Form produk dengan upload foto (kompres di klien)
- [ ] Stok masuk (pembelian) dengan harga modal; penyesuaian & opname dengan alasan
- [ ] Batas stok minimum + daftar stok menipis
- [ ] Seed contoh produk per jenis usaha untuk onboarding

### Fase 3 — Kasir & pembayaran (minggu 7–9)

- [ ] Layar kasir: grid produk, chip kategori, pencarian, scan barcode USB
- [ ] Store keranjang (Zustand) + persist ke IndexedDB agar tidak hilang saat refresh
- [ ] Diskon item/transaksi dengan hak akses
- [ ] Modal bayar: tunai (pecahan cepat, kembalian), QRIS statis, transfer, split
- [ ] `POST /sales` transaksional + idempoten; test konkurensi stok
- [ ] Struk: template 58/80mm, print browser, kirim WhatsApp (`wa.me` + teks struk)
- [ ] Buka/tutup shift, kas masuk/keluar, hitung per pecahan
- [ ] Simpan pesanan (open bill)
- [ ] Test end-to-end Playwright: alur kasir lengkap dari login PIN sampai tutup shift

### Fase 4 — Laporan & kasbon (minggu 10–11)

- [x] Dashboard hari ini + grafik 7 hari
- [x] Laporan ringkasan, per metode bayar, produk terlaris, per kasir, dengan filter tanggal
- [x] Pelanggan & kasbon: catat, bayar sebagian, saldo, pengingat WhatsApp
- [x] Riwayat transaksi, detail, cetak ulang, void (penuh) dengan persetujuan pemilik + audit log — refund parsial ditunda (D29)
- [x] Uji akurasi: bandingkan laporan dengan perhitungan spreadsheet dari data uji

### Fase 5 — Offline & perangkat (minggu 12–13)

- [ ] PWA: manifest, ikon, service worker, prompt install
- [ ] Cache produk/pelanggan di Dexie + `GET /sync` delta
- [ ] Antrean transaksi offline, `POST /sales/batch`, indikator "belum terkirim"
- [ ] Printer thermal via Web Bluetooth/WebUSB (ESC/POS), simpan printer favorit
- [ ] Scan barcode via kamera (BarcodeDetector, fallback ZXing)
- [ ] Uji: matikan jaringan 1 jam, 200 transaksi, nyalakan, cek tidak ada duplikat & stok benar

### Fase 6 — Pilot & QA (minggu 14–15)

- [ ] Rekrut 5–10 toko pilot (gratis 6 bulan), dampingi hari pertama
- [ ] Pantau Sentry & catat waktu transaksi sebenarnya
- [ ] Uji perangkat: 3 HP Android murah, 1 tablet, 1 laptop, 2 merek printer thermal
- [ ] Review keamanan: isolasi tenant, rate limit, dependensi
- [ ] Perbaiki temuan; tambah fitur P1 yang paling diminta (impor CSV, varian)

### Fase 7 — Rilis (minggu 16)

- [ ] Deploy produksi, domain, SSL, backup harian + uji restore
- [ ] Halaman landing, harga, kebijakan privasi, syarat layanan
- [ ] Panduan singkat dalam aplikasi (3 tooltip saat pertama pakai) + video 60 detik
- [ ] Kanal dukungan WhatsApp

### Setelah rilis (P2)

QRIS dinamis via payment gateway dengan webhook, multi-outlet, loyalti/poin, meja & dapur untuk F&B, integrasi ojol dan marketplace.

## 12. Risiko & pertanyaan terbuka

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Web Bluetooth tidak didukung Safari iOS | Pengguna iPhone tidak bisa cetak langsung | Fallback print browser; sarankan Android/tablet untuk kasir |
| Data offline hilang karena browser membersihkan storage | Transaksi tidak tercatat | Minta `navigator.storage.persist()`, peringatan jika antrean > 24 jam belum terkirim |
| Stok minus akibat transaksi offline dari 2 perangkat | Stok tidak akurat | Tandai produk minus di dashboard; opname mudah |
| QRIS statis tidak bisa dikonfirmasi otomatis | Pembayaran palsu/belum masuk | Wajib centang konfirmasi, tampilkan nama merchant; QRIS dinamis di P2 |
| Fitur pajak dianggap nasihat resmi | Risiko hukum | Label "estimasi" + tautan ke DJP; tidak membuat laporan pajak |
| Fitur menggelembung seperti kompetitor | Kehilangan kesederhanaan | Setiap fitur baru harus lolos uji "apakah Bu Sari butuh ini minggu ini?" |

**Pertanyaan terbuka**

- [ ] Model bisnis: freemium (gratis 1 kasir, berbayar untuk multi-kasir & laporan lanjutan) atau langganan flat \~Rp25–50rb/bln?
- [ ] Jenis usaha pertama yang difokuskan: kelontong atau F&B? (memengaruhi prioritas varian & open bill)
- [ ] Payment gateway untuk QRIS dinamis di P2 (perlu bandingkan biaya dan syarat KYC)
- [ ] Nama produk & domain

## 13. Sumber

- [BI bebaskan MDR QRIS transaksi ≤ Rp100 ribu](https://achmadnurhidayat.id/bank-indonesia-bebaskan-tarif-mdr-qris)
- [BI perluas kebijakan MDR QRIS 0% untuk pedagang](https://achmadnurhidayat.id/bi-perluas-kebijakan-mdr-qris-nol-persen)
- [QRIS: isu keamanan dan biaya (UKM Indonesia)](https://ukmindonesia.id/baca-deskripsi-posts/qris-makin-mendunia-isu-keamanan-dan-biaya-admin-masih-dipertanyakan-publik)
- [Aturan pajak UMKM dalam PP 20/2026 (Pajakku)](https://pajakku.com/artikel/aturan-pajak-umkm-yang-masih-berlaku-dalam-pp-202026)
- [PP 20/2026 dan tarif final bagi CV/PT (IKPI)](https://ikpi.or.id/pp-20-tahun-2026-berakhirnya-era-tarif-final-05-persen-bagi-cv-dan-pt-apakah-selalu-merugikan/)
- [DJP: PP 20/2026 perkuat UMKM (Investortrust)](https://investortrust.id/macro/105712/dirjen-pajak-sebut-pp-202026-beri-kemudahan-tarif-bagi-umkm)
- [Excash: kasir offline untuk UMKM (SENTRINOV)](https://proceeding.isas.or.id/index.php/sentrinov/article/view/1714/1122)
- [Kasir Pintar di toko kelontong (PNJ)](https://prosiding.pnj.ac.id/index.php/SNAM/article/download/5433/3134/27242)
- [Aplikasi kasir RidhoQua (IT Telkom Purwokerto)](https://repository.ittelkom-pwt.ac.id/11149/4/BAB%20V.pdf)
- [Modul keuangan POS UMKM Marikh (Politap)](https://jurnal.politap.ac.id/index.php/literasi/article/download/1307/843/6791)
- [Fitur Qasir untuk UMKM (Gizmologi)](https://gizmologi.id/news/qasir-umkm/)
- [Kloa, aplikasi kasir UMKM (Beritajatim)](https://beritajatim.com/?p=1496487)
- [Perbandingan 7 POS di Indonesia (HitPay)](https://blog.hitpayapp.com/pos-system-indonesia-comparison)
- [Aplikasi POS gratis di Indonesia (HitPay)](https://hitpayapp.com/blog/sistem-aplikasi-pos-gratis-di-indonesia)
