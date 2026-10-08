import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const inputId = id ?? `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-12 rounded-[10px] border bg-surface px-4 text-base text-tinta',
          'placeholder:text-tinta-muted',
          'focus:outline-2 focus:outline-offset-1 focus:outline-pandan-600',
          error ? 'border-cabai-600' : 'border-garis',
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
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
