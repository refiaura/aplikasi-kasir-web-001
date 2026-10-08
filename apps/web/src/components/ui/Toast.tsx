import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  desc?: string;
  kind: ToastKind;
}

type ShowToast = (t: Omit<ToastItem, 'id'>) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

const kindIcon: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const kindClass: Record<ToastKind, string> = {
  success: 'text-pandan-600',
  error: 'text-cabai-600',
  info: 'text-tinta-muted',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback<ShowToast>((t) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const Icon = kindIcon[t.kind];
          return (
            <div
              key={t.id}
              className="anim-sheet-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[14px] border border-garis bg-surface p-4"
            >
              <Icon size={20} className={cn('mt-0.5 shrink-0', kindClass[t.kind])} />
              <div>
                <p className="font-semibold text-tinta">{t.title}</p>
                {t.desc ? <p className="text-sm text-tinta-muted">{t.desc}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
