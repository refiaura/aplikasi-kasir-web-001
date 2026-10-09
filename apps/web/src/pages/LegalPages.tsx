import { Link } from '@tanstack/react-router';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-kertas">
      <header className="border-b border-garis bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-extrabold tracking-tight">Kasir UMKM</Link>
          <Link to="/daftar" className="text-sm font-bold text-pandan-600 hover:underline">Daftar gratis</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <div className="prose-legal mt-6 space-y-4 text-sm leading-relaxed text-tinta">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Kebijakan privasi">
      <p><strong>Terakhir diperbarui: Oktober 2026.</strong></p>
      <h2 className="font-bold">Data yang kami kumpulkan</h2>
      <p>
        Kami menyimpan data yang Anda masukkan: nama toko, akun pengguna, produk, transaksi,
        pelanggan, dan kasbon. Data login (email, kata sandi terenkripsi) dipakai untuk
        autentikasi. Kami tidak menjual data Anda.
      </p>
      <h2 className="font-bold">Isolasi data</h2>
      <p>
        Setiap toko terisolasi penuh di database — pengguna satu toko tidak bisa melihat
        data toko lain. Kasir hanya bisa mengakses data perangkatnya sendiri.
      </p>
      <h2 className="font-bold">Keamanan</h2>
      <p>
        Kata sandi dienkripsi dengan Argon2id. Sesi memakai cookie httpOnly yang aman.
        Koneksi memakai HTTPS di production.
      </p>
      <h2 className="font-bold">Penyimpanan lokal</h2>
      <p>
        Aplikasi menyimpan salinan katalog dan antrean transaksi di perangkat Anda
        (IndexedDB) agar bisa dipakai offline. Data ini milik Anda dan ikut terhapus
        bila Anda menghapus data aplikasi.
      </p>
      <h2 className="font-bold">Hak Anda</h2>
      <p>
        Anda bisa meminta ekspor atau penghapusan data toko Anda kapan saja lewat
        dukungan WhatsApp.
      </p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Syarat layanan">
      <p><strong>Terakhir diperbarui: Oktober 2026.</strong></p>
      <h2 className="font-bold">Layanan</h2>
      <p>
        Kasir UMKM adalah aplikasi kasir berbasis web untuk usaha mikro dan kecil.
        Paket gratis bisa dipakai selamanya dengan batasan 1 perangkat kasir.
      </p>
      <h2 className="font-bold">Tanggung jawab pengguna</h2>
      <p>
        Anda bertanggung jawab atas kebenaran data produk, harga, dan transaksi yang
        dimasukkan. Angka laba kotor adalah estimasi berdasarkan harga pokok yang
        Anda catat, bukan nasihat pajak resmi.
      </p>
      <h2 className="font-bold">Ketersediaan</h2>
      <p>
        Kami berusaha menjaga layanan tetap online, tetapi mode offline tersedia
        bila koneksi terputus. Backup dilakukan harian; namun Anda disarankan
        menyimpan catatan penting secara berkala.
      </p>
      <h2 className="font-bold">Pembayaran & berhenti</h2>
      <p>
        Paket berbayar ditagih per bulan dan bisa dibatalkan kapan saja; akses
        berlanjut sampai akhir periode. Kami bisa menangguhkan akun yang menyalahgunakan
        layanan.
      </p>
      <h2 className="font-bold">Perubahan</h2>
      <p>
        Syarat ini bisa diperbarui; perubahan besar akan diumumkan di aplikasi.
      </p>
    </LegalShell>
  );
}
