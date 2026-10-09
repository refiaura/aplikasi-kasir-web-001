import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { BackButton } from './PageHeader';

/** Bingkai konsisten untuk halaman auth: branding + tombol kembali ke landing. */
export function AuthShell({
  title,
  desc,
  children,
  footer,
}: {
  title: string;
  desc: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-kertas">
      <header className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        <BackButton to="/" label="Beranda" />
        <Link to="/" className="text-lg font-extrabold tracking-tight">
          Kasir UMKM
        </Link>
        <span className="w-16" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-md px-4 pb-10">
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-tinta-muted">{desc}</p>
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 space-y-2 text-center text-sm">{footer}</div>}
      </main>
    </div>
  );
}
