# Catatan Keputusan (Fase 1)

Asumsi dan keputusan teknis yang diambil saat mengerjakan Fase 1. Diperbarui tiap
fase sesuai aturan PRD.

## D1 — Sesi server-side, bukan JWT

Cookie `sid` (httpOnly, `SameSite=Lax`, `Secure` saat production) menyimpan ID sesi
acak. Data sesi (user, store, role, kedaluwarsa 12 jam) disimpan di tabel
`sessions` di database. Alasan: logout dan pencabutan sesi langsung berlaku tanpa
menunggu token kedaluwarsa; tidak ada token di localStorage sesuai PRD.

## D2 — Rate limit in-memory per instance

Kegagalan login/PIN dicatat di `Map` dalam memori: 5 kali gagal → kunci 5 menit
(HTTP 429, kode `TERLALU_BANYAK_PERCOBAAN`). Kunci dihitung per email (login) atau
per kode perangkat (PIN). Untuk deployment multi-instance, pindahkan ke Redis atau
tabel database sebelum production.

## D3 — Pencocokan PIN kasir

`POST /auth/pin` menerima `{ deviceCode, pin }`. Server mencari perangkat dengan
kode tersebut, lalu mencocokkan PIN (Argon2id) ke seluruh kasir aktif di toko
pemilik perangkat. Ini disengaja agar kasir cukup mengingat kode perangkat + PIN,
tanpa memilih nama dulu. Kode perangkat unik per toko; bila kode sama di dua toko,
yang PIN-nya cocok yang menang.

## D4 — Email dinormalisasi lowercase

Kolom `users.email` bertipe `citext` dan selalu dinormalisasi ke lowercase di
aplikasi sebelum disimpan/dicari, supaya unik case-insensitive di semua query.

## D5 — Migrasi via drizzle-kit generate

Skema ditulis di `apps/api/src/db/schema.ts`, migrasi SQL digenerate dengan
`drizzle-kit generate`. Ekstensi `pgcrypto`, `citext`, `pg_trgm` dibuat di awal
file migrasi pertama.

## D6 — pg-boss terinstal tapi belum dipakai

Paket `pg-boss` masuk dependensi sesuai stack PRD, tetapi belum di-wire ke
aplikasi. Baru dipakai di Fase 5 untuk job sinkronisasi/antrean offline.

## D7 — Dashboard Fase 1 mengembalikan angka nol

`GET /dashboard/summary` mengembalikan struktur dashboard dengan semua angka nol
dan daftar kosong. Angka asli diisi di Fase 4 (Laporan & kasbon).

## D8 — Lingkungan build

CI memakai Node 22 sesuai PRD. Sandbox pengembangan memakai Node 24 dan tetap
lolos seluruh pengecekan; `engines` diset `>=22`.

## D9 — Router berbasis kode (tanpa codegen)

TanStack Router dipakai dengan definisi route berbasis kode di
`apps/web/src/router.tsx`, bukan file-based routing. Alasan: tanpa langkah
codegen, `typecheck`/`build`/`test` deterministik di CI. `@kasir/shared`
di-resolve dari source via `tsconfig paths` + `vite-tsconfig-paths` di web
(agar HMR ikut mengawasi perubahan shared); di API resolve dari `dist`
(produksi memakai hasil build shared).

## D10 — E2E Playwright belum masuk CI

Spec e2e (`apps/web/e2e`) memverifikasi alur daftar → dashboard kosong →
perangkat → PIN kasir dan bisa dijalankan lokal (lihat komentar di
`playwright.config.ts`). Belum di-wire ke CI Fase 1; masuk CI di Fase 3
bersama test alur kasir penuh.

# Catatan Keputusan (Fase 2)

## D11 — Master data: tulis owner-only, baca boleh kasir

CRUD kategori/produk dan mutasi stok manual hanya pemilik. `GET /products` dan
riwayat mutasi boleh dibaca kasir (dibutuhkan layar kasir Fase 3). Keputusan izin,
bukan fitur baru.

## D12 — Stok awal = mutasi purchase "Stok awal"

`initialStock` saat pembuatan produk (dan seed) selalu dicatat sebagai
`stock_movements` tipe `purchase` dalam satu transaksi, agar ledger stok lengkap
sejak hari pertama.

## D13 — Harga modal = pembelian terakhir (last cost)

`POST /stock/movements` tipe `purchase` dengan `unitCost` memperbarui
`products.cost`. Bukan rata-rata tertimbang — paling sederhana dan dapat
diprediksi; bisa direvisi bila akuntansi membutuhkannya.

## D14 — Penyesuaian wajib alasan; opname = delta di klien

`adjustment` membutuhkan `note` (alasan). Opname tidak punya tipe tersendiri: UI
menghitung selisih (hasil hitung − stok tercatat) dan mengirimnya sebagai
`adjustment` dengan alasan "Opname: …".

## D15 — Foto produk di disk lokal `/uploads/`

`POST /uploads` (maks 3MB, hanya WebP/PNG/JPEG) menyimpan file bernama UUID dan
diserve statis di `/uploads/*`; direktori di-mount sebagai volume di
docker-compose. Production multi-instance disarankan pindah ke object storage.

## D16 — Hapus produk = soft delete

`DELETE /products/:id` hanya mengeset `is_active=false` agar riwayat transaksi
tetap utuh. Produk nonaktif hilang dari daftar dan pencarian.

## D17 — Tipe angka: bigint→number, numeric→Number() di DTO

`price`/`cost` memakai `bigint(mode: 'number')` — aman hingga
Rp9.007.199.254.740.993. `stock_qty`/`min_stock` `numeric(12,3)` dikembalikan pg
sebagai string lalu dikonversi `Number()` di DTO.

## D18 — Impor CSV tetap di Fase 6

Endpoint `POST /products/import` tercantum di PRD pada bagian impor/ekspor CSV
(Fase 6); tidak dikerjakan di Fase 2 sesuai aturan cakupan fase.

## D19 — Versi plugin Fastify 5

`@fastify/multipart` v8 dan `@fastify/static` v7 hanya mendukung Fastify 4
(gagal di `checkVersion` fastify-plugin). Dinaikkan ke multipart v9 / static v8.
`@fastify/static` mewajibkan `root` absolut → `config.uploadDir` selalu di-`resolve()`.

## D20 — Nomor struk per toko per hari

`INV-YYYYMMDD-NNNN` via tabel `receipt_counters(store_id, date, last_no)` dengan
upsert atomik (`ON CONFLICT ... DO UPDATE`), aman dari duplikat saat dua kasir
jual bersamaan. Tanggal memakai zona Asia/Jakarta (default zona toko, PRD §7).

## D21 — Persetujuan diskon oleh pemilik

PRD menyebut "PIN pemilik" untuk persetujuan, tetapi pemilik di sistem ini tidak
punya PIN (hanya kata sandi). Diimplementasikan sebagai `approvalPassword` di
payload `POST /sales`: diverifikasi Argon2 terhadap pemilik toko yang aktif,
tidak pernah disimpan. Kasir dengan `permissions.discount` tidak perlu ini.

## D22 — Penjualan hanya oleh kasir berperangkat

`POST /sales` mewajibkan sesi kasir dengan `device_id` dan shift terbuka di
perangkat itu (`sessions.device_id` ditambahkan di migrasi 0002). Pemilik tidak
punya shift/perangkat sehingga tidak berjualan di Fase 3; riwayat penjualan
pemilik mencakup semua perangkat.

## D23 — Stok dikurangi atomik, boleh minus

Pengurangan stok memakai `stock_qty = stock_qty - qty` di SQL (tidak ada lost
update saat konkurensi). Stok boleh minus sementara sesuai PRD §7 (offline);
dashboard menandai produk minus di fase berikutnya.

## D24 — Pesanan tersimpan (open bill) lokal per perangkat

`openBills` disimpan di Dexie per perangkat, bukan di server — cukup untuk
kebutuhan "simpan pesanan" Fase 3 tanpa sinkronisasi antar-perangkat.

## D25 — QRIS statis ditunda

Metode `qris`/`transfer` memakai nomor referensi manual. Konfigurasi gambar/teks
QRIS statis per toko ditunda ke fase berikutnya.

## D26 — Kasbon & void di luar Fase 3

Metode `kasbon` ditolak API (400) hingga Fase 4; void/refund juga Fase 4.

## D27 — Scan barcode via kolom cari

Scanner USB bertindak sebagai keyboard (keyboard wedge) sehingga cukup diketik
di kolom pencarian kasir; integrasi kamera ditunda ke Fase 5.

## D28 — CORS hanya bila CORS_ORIGIN diisi

API tidak mengaktifkan CORS secara default; diaktifkan via env `CORS_ORIGIN`
untuk E2E CI (web :5173 memanggil API :8080). Di Docker production, nginx
memproksi `/api` sehingga tidak perlu CORS.

## D29 — Void penuh di Fase 4, refund parsial ditunda

Fase 4 mengimplementasikan void (pembatalan penuh transaksi). Refund parsial
(pengembalian sebagian item dengan kondisi layak/rusak) ditunda karena butuh
aturan stok dan kas yang lebih kompleks. Void: status → `voided`, stok
dikembalikan via mutasi `void`, kasbon dibalik, kas shift dikoreksi bila shift
masih buka, audit `sale.voided`.

## D30 — Otorisasi void: pemilik langsung, kasir butuh kata sandi pemilik

Pemilik bisa void langsung; kasir wajib memasukkan `approvalPassword` yang
diverifikasi terhadap kata sandi pemilik aktif (tidak disimpan) — sama seperti
mekanisme diskon (D21). Pengganti "PIN pemilik" karena pemilik tidak punya PIN.

## D31 — Kasbon hanya untuk pelanggan terdaftar

Pembayaran kasbon wajib `customerId`; saldo bertambah via `kasbon_entries`
(+ hutang). Bayar kasbon boleh sebagian, tidak boleh melebihi saldo (tolak 400).
Pengingat WhatsApp via link `wa.me` dengan teks terisi otomatis.

## D32 — Kasbon hanya pembayaran penuh di kasir

Di dialog bayar kasir, kasbon hanya tersedia sebagai metode tunggal (bukan
gabungan/split) agar pemilihan pelanggan tetap sederhana. API tetap
mendukungnya bila dibutuhkan.

## D33 — Agregasi laporan memakai zona Asia/Jakarta

Filter tanggal dan pengelompokan harian dihitung dalam zona Asia/Jakarta
(`AT TIME ZONE 'Asia/Jakarta'`), bukan UTC. Transaksi void dikecualikan dari
semua laporan.

## D34 — Kasbon offline diantrekan, divalidasi saat terkirim

Transaksi kasbon boleh masuk antrean offline; server memvalidasi pelanggan
saat batch dikirim. Bila gagal (mis. pelanggan dihapus), item bertahan di
antrean dengan pesan error untuk dicoba lagi.

## D35 — Scan kamera tanpa fallback ZXing

Scan barcode memakai BarcodeDetector bawaan Chromium. Bila browser tidak
mendukung, pengguna tetap bisa ketik kode manual atau pakai scanner USB
(keyboard wedge, D27) — tanpa menambah dependensi ZXing.

## D36 — Konflik katalog: server menang

`GET /sync?since=` mengembalikan delta berdasarkan `updated_at`; klien
menimpa cache lokal dengan data server tanpa merge.

## D37 — client_txn_id memakai UUID v7

Sesuai PRD, ID transaksi klien memakai UUID v7 (timestamp + acak) agar
terurut waktu dan tetap unik untuk idempotensi.
