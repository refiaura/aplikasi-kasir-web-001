import { Link } from '@tanstack/react-router';
import { BarChart3, Check, ChevronDown, Printer, Smartphone, WifiOff, HandCoins, ScanBarcode } from 'lucide-react';
import { Button } from '../components/ui/Button';

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Kasir secepat kilat',
    desc: 'Cari produk, scan barcode, bayar tunai/QRIS/transfer dalam hitungan detik. Tombol besar, cocok untuk HP.',
  },
  {
    icon: WifiOff,
    title: 'Tetap jalan saat offline',
    desc: 'Internet putus? Transaksi tersimpan di perangkat dan terkirim otomatis saat online. Tanpa duplikat.',
  },
  {
    icon: BarChart3,
    title: 'Laporan jelas',
    desc: 'Omzet, laba kotor, produk terlaris, dan kinerja kasir — per hari, per minggu, per bulan.',
  },
  {
    icon: HandCoins,
    title: 'Kasbon tercatat rapi',
    desc: 'Catat hutang pelanggan, bayar sebagian, dan ingatkan via WhatsApp sekali ketuk.',
  },
  {
    icon: Printer,
    title: 'Cetak struk thermal',
    desc: 'Hubungkan printer Bluetooth dan cetak struk 58mm langsung dari HP atau tablet.',
  },
  {
    icon: ScanBarcode,
    title: 'Stok terkendali',
    desc: 'Stok berkurang otomatis tiap penjualan. Peringatan saat menipis atau minus.',
  },
];

const PLANS = [
  {
    name: 'Gratis',
    price: 'Rp0',
    period: 'selamanya',
    features: ['1 perangkat kasir', 'Produk & kategori tanpa batas', 'Laporan harian', 'Kasbon pelanggan'],
    cta: 'Daftar gratis',
    highlight: false,
  },
  {
    name: 'Warung',
    price: 'Rp35.000',
    period: '/bulan',
    features: [
      'Semua fitur Gratis',
      'Perangkat kasir tanpa batas',
      'Laporan lanjutan & per kasir',
      'Mode offline penuh',
      'Dukungan WhatsApp prioritas',
    ],
    cta: 'Mulai 14 hari gratis',
    highlight: true,
  },
];

const FAQS = [
  {
    q: 'Apakah bisa dipakai tanpa internet?',
    a: 'Bisa. Aplikasi menyimpan transaksi di perangkat saat offline dan mengirimnya otomatis begitu online. Katalog produk juga tersimpan lokal.',
  },
  {
    q: 'Perangkat apa saja yang didukung?',
    a: 'HP Android, tablet, dan laptop — cukup buka lewat browser Chrome. Untuk cetak struk, gunakan printer thermal Bluetooth.',
  },
  {
    q: 'Apakah data toko saya aman?',
    a: 'Setiap toko terisolasi penuh; kasir hanya melihat data perangkatnya. Kata sandi dienkripsi dengan Argon2id dan sesi memakai cookie aman.',
  },
  {
    q: 'Bisakah pindah dari buku catatan?',
    a: 'Bisa. Daftarkan produk manual atau impor sekaligus, lalu langsung jualan. Data tersimpan rapi dan bisa dilihat kapan saja.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-kertas">
      {/* Navigasi */}
      <header className="sticky top-0 z-30 border-b border-garis bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-extrabold tracking-tight">Kasir UMKM</span>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="rounded-[10px] px-4 py-2 text-sm font-bold text-tinta-muted hover:text-tinta">
              Masuk
            </Link>
            <Link to="/daftar">
              <Button size="sm">Daftar gratis</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
          Kasir simpel untuk warung & kedai Indonesia
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-tinta-muted">
          Gantikan buku catatan dan kalkulator. Jualan lebih cepat, stok terkendali,
          kasbon tercatat — bahkan saat internet putus.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/daftar">
            <Button size="lg">Daftar gratis</Button>
          </Link>
          <a href="#harga">
            <Button size="lg" variant="secondary">Lihat harga</Button>
          </a>
        </div>
        <p className="mt-4 text-sm text-tinta-muted">Tanpa kartu kredit · Bisa dipakai dalam 5 menit</p>
      </section>

      {/* Fitur */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-label="Fitur">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">Semua yang warung butuhkan</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="rounded-[14px] border border-garis bg-surface p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-pandan-50 text-pandan-600">
                <Icon size={22} />
              </div>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-tinta-muted">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Harga */}
      <section id="harga" className="mx-auto max-w-6xl px-4 py-12" aria-label="Harga">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">Harga jujur</h2>
        <p className="mt-2 text-center text-tinta-muted">Mulai gratis. Naik kelas saat usaha bertumbuh.</p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
          {PLANS.map((p) => (
            <article
              key={p.name}
              className={`relative rounded-[16px] border p-6 ${p.highlight ? 'border-2 border-pandan-600 bg-surface' : 'border-garis bg-surface'}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[999px] bg-pandan-600 px-3 py-1 text-xs font-extrabold text-white">
                  Populer
                </span>
              )}
              <h3 className="font-bold">{p.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-extrabold tabular-nums">{p.price}</span>
                <span className="text-sm text-tinta-muted">{p.period}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-pandan-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/daftar" className="mt-6 block">
                <Button className="w-full" variant={p.highlight ? 'primary' : 'secondary'}>
                  {p.cta}
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12" aria-label="Pertanyaan umum">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">Pertanyaan umum</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group rounded-[14px] border border-garis bg-surface p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-bold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown size={18} className="shrink-0 text-tinta-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-tinta-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA akhir */}
      <section className="mx-auto max-w-6xl px-4 py-12 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight">Siap merapikan kasir toko?</h2>
        <p className="mt-2 text-tinta-muted">Daftar gratis, langsung bisa dipakai hari ini.</p>
        <Link to="/daftar" className="mt-6 inline-block">
          <Button size="lg">Daftar gratis sekarang</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-garis bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-tinta-muted md:flex-row">
          <span className="font-bold text-tinta">Kasir UMKM</span>
          <nav className="flex gap-4">
            <Link to="/privasi" className="hover:text-tinta">Kebijakan privasi</Link>
            <Link to="/syarat" className="hover:text-tinta">Syarat layanan</Link>
            <a href="https://wa.me/" target="_blank" rel="noreferrer" className="hover:text-tinta">Dukungan WhatsApp</a>
          </nav>
          <span>© 2026 Kasir UMKM</span>
        </div>
      </footer>
    </div>
  );
}
