import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
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
          'anim-slide-up fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md',
          '-translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-garis bg-surface p-6',
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
