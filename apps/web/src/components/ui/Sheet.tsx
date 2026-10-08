import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/** Bottom sheet untuk layar kecil (dipakai untuk keranjang di Fase 3). */
export function SheetContent({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="anim-fade-in fixed inset-0 z-40 bg-black/40" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          'anim-sheet-up fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto',
          'rounded-t-[14px] border-t border-garis bg-surface p-6',
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogPrimitive.Title className="text-xl font-bold text-tinta">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Tutup"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] text-tinta-muted hover:bg-kertas"
          >
            <X size={20} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
