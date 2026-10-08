# Aplikasi Kasir Web 001

Aplikasi kasir (POS) berbasis web/PWA untuk UMKM Indonesia: warung, kedai, dan toko
kecil (1 outlet, 1–3 kasir). Spesifikasi lengkap ada di [`docs/PRD.md`](docs/PRD.md).

## Struktur monorepo

```
apps/web          React 19 + Vite + TanStack Router/Query + Zustand + Tailwind v4
apps/api          Fastify + Drizzle ORM + PostgreSQL 16
packages/shared   Skema Zod dan tipe bersama (sumber kebenaran validasi)
docs/             PRD dan catatan keputusan (DECISIONS.md)
```

## Cara menjalankan (lokal)

### Opsi A — Docker Compose (disarankan)

```bash
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8080
- Migrasi database berjalan otomatis saat container `api` start.

### Opsi B — manual

```bash
# 1. Database saja via compose
docker compose up -d db

# 2. Install dependensi
pnpm install

# 3. Migrasi
pnpm db:migrate

# 4. Jalankan API dan web (dua terminal)
pnpm dev:api
pnpm dev:web
```

- Web dev: http://localhost:5173 (butuh `VITE_API_URL=http://localhost:8080`)
- API dev: http://localhost:8080

## Perintah penting

| Perintah           | Keterangan                              |
| ------------------ | --------------------------------------- |
| `pnpm lint`        | ESLint seluruh monorepo                 |
| `pnpm typecheck`   | TypeScript strict seluruh monorepo      |
| `pnpm test`        | Vitest seluruh monorepo                 |
| `pnpm build`       | Build shared, api, dan web              |
| `pnpm db:generate` | Generate migrasi Drizzle dari skema     |
| `pnpm db:migrate`  | Jalankan migrasi ke database            |

Test API yang memakai database butuh `DATABASE_URL` menunjuk ke database
PostgreSQL yang sudah dimigrasi (di CI memakai service postgres).

## Alur Fase 1

1. Buka web → **Daftar** sebagai pemilik (nama, nama toko, email, kata sandi).
2. Masuk ke dashboard kosong.
3. Buka **Perangkat** → daftarkan perangkat (mis. `KASIR-01`) dan buat akun
   kasir dengan PIN 6 digit.
4. Di perangkat kasir: buka halaman **PIN**, masukkan kode perangkat + PIN.
