import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { BackButton } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-kertas">
      <header className="border-b border-garis bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <BackButton to="/" label="Beranda" />
            <Link to="/" className="text-lg font-extrabold tracking-tight">
              Kasir UMKM
            </Link>
          </div>
          <Link to="/daftar">
            <Button size="sm">Daftar gratis</Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <div className="mt-6 space-y-6 text-sm leading-relaxed text-tinta">{children}</div>
        <div className="mt-10 rounded-[14px] border border-garis bg-surface p-6 text-center">
          <p className="font-bold">Siap merapikan kasir tokomu?</p>
          <p className="mt-1 text-sm text-tinta-muted">Daftar gratis, langsung bisa dipakai hari ini.</p>
          <Link to="/daftar" className="mt-4 inline-block">
            <Button>Daftar gratis</Button>
          </Link>
        </div>
      </main>
      <footer className="border-t border-garis bg-surface">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-tinta-muted sm:flex-row">
          <Link to="/" className="font-bold text-tinta">
            Kasir UMKM
          </Link>
          <nav className="flex gap-4">
            <Link to="/privasi" className="hover:text-tinta">
              Kebijakan privasi
            </Link>
            <Link to="/syarat" className="hover:text-tinta">
              Syarat layanan
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-garis pb-2 text-base font-extrabold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-tinta-muted">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Kebijakan privasi">
      <p className="text-tinta-muted">
        <strong className="text-tinta">Terakhir diperbarui: Oktober 2026.</strong>
      </p>
      <Section title="Data yang kami kumpulkan">
        <p>
          Kami menyimpan data yang Anda masukkan: nama toko, akun pengguna, produk, transaksi,
          pelanggan, dan kasbon. Data login (email, kata sandi terenkripsi) dipakai untuk
          autentikasi. Kami tidak menjual data Anda.
        </p>
      </Section>
      <Section title="Isolasi data">
        <p>
          Setiap toko terisolasi penuh di database — pengguna satu toko tidak bisa melihat data
          toko lain. Kasir hanya bisa mengakses data perangkatnya sendiri.
        </p>
      </Section>
      <Section title="Keamanan">
        <p>
          Kata sandi dienkripsi dengan Argon2id. Sesi memakai cookie httpOnly yang aman. Koneksi
          memakai HTTPS di production.
        </p>
      </Section>
      <Section title="Penyimpanan lokal">
        <p>
          Aplikasi menyimpan salinan katalog dan antrean transaksi di perangkat Anda (IndexedDB)
          agar bisa dipakai offline. Data ini milik Anda dan ikut terhapus bila Anda menghapus
          data aplikasi.
        </p>
      </Section>
      <Section title="Hak Anda">
        <p>
          Anda bisa meminta ekspor atau penghapusan data toko Anda kapan saja lewat dukungan
          WhatsApp.
        </p>
      </Section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Syarat layanan">
      <p className="text-tinta-muted">
        <strong className="text-tinta">Terakhir diperbarui: Oktober 2026.</strong>
      </p>
      <Section title="Layanan">
        <p>
          Kasir UMKM adalah aplikasi kasir berbasis web untuk usaha mikro dan kecil. Paket gratis
          bisa dipakai selamanya dengan batasan 1 perangkat kasir.
        </p>
      </Section>
      <Section title="Tanggung jawab pengguna">
        <p>
          Anda bertanggung jawab atas kebenaran data produk, harga, dan transaksi yang
          dimasukkan. Angka laba kotor adalah estimasi berdasarkan harga pokok yang Anda catat,
          bukan nasihat pajak resmi.
        </p>
      </Section>
      <Section title="Ketersediaan">
        <p>
          Kami berusaha menjaga layanan tetap online, tetapi mode offline tersedia bila koneksi
          terputus. Backup dilakukan harian; namun Anda disarankan menyimpan catatan penting
          secara berkala.
        </p>
      </Section>
      <Section title="Pembayaran & berhenti">
        <p>
          Paket berbayar ditagih per bulan dan bisa dibatalkan kapan saja; akses berlanjut
          sampai akhir periode. Kami bisa menangguhkan akun yang menyalahgunakan layanan.
        </p>
      </Section>
      <Section title="Perubahan">
        <p>Syarat ini bisa diperbarui; perubahan besar akan diumumkan di aplikasi.</p>
      </Section>
    </LegalShell>
  );
}
