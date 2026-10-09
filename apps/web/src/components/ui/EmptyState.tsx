import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

/** Tampilan kosong yang membantu: ikon, pesan, dan tombol aksi. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  desc,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[14px] border border-dashed border-garis bg-surface px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-kertas text-tinta-muted">
        <Icon size={28} />
      </div>
      <p className="mt-4 font-bold">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-tinta-muted">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
