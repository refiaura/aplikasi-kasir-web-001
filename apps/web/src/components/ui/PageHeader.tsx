import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** Tombol kembali konsisten: pakai history bila ada, fallback ke rute yang diberi. */
export function BackButton({ to, label = 'Kembali' }: { to: string; label?: string }) {
  const navigate = useNavigate();
  const { history } = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (history.length > 1) {
          history.back();
        } else {
          void navigate({ to });
        }
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2 text-sm font-bold text-tinta-muted hover:bg-kertas hover:text-tinta"
      aria-label={label}
    >
      <ArrowLeft size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Breadcrumb ringan untuk hierarki 2–3 level. */
export function Breadcrumb({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-tinta-muted">
      {trail.map((t, i) => (
        <span key={t.label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} aria-hidden />}
          {t.to ? (
            <Link to={t.to} className="font-semibold hover:text-tinta hover:underline">
              {t.label}
            </Link>
          ) : (
            <span className="font-semibold text-tinta" aria-current="page">
              {t.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/**
 * Header halaman standar: tombol back opsional, judul, deskripsi,
 * dan slot aksi di kanan. Satu bahasa visual untuk semua halaman.
 */
export function PageHeader({
  title,
  desc,
  backTo,
  backLabel,
  trail,
  actions,
}: {
  title: string;
  desc?: string;
  backTo?: string;
  backLabel?: string;
  trail?: { label: string; to?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-1">
          {backTo && <BackButton to={backTo} label={backLabel} />}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            {desc && <p className="mt-0.5 text-sm text-tinta-muted">{desc}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {trail && <Breadcrumb trail={trail} />}
    </div>
  );
}
