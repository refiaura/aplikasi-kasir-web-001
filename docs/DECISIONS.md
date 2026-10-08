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
