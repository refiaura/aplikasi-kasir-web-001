import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Boleh dikosongkan bila label sudah disampaikan via aria-label. */
  label?: string;
  error?: string;
  hint?: string;
  /** Elemen di kanan dalam input, mis. tombol tampil/sembunyi kata sandi. */
  trailing?: ReactNode;
  /** Elemen di kiri dalam input, mis. ikon pencarian. */
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, trailing, leading, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `input-${autoId}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-tinta">
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-tinta-muted">
            {leading}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-12 w-full rounded-[10px] border bg-surface px-4 text-base text-tinta',
            'placeholder:text-tinta-muted',
            'focus:outline-2 focus:outline-offset-1 focus:outline-pandan-600',
            error ? 'border-cabai-600' : 'border-garis',
            trailing ? 'pr-12' : null,
            leading ? 'pl-11' : null,
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-cabai-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-tinta-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
