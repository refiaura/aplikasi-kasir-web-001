import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-aksi text-aksi-text hover:bg-aksi-hover disabled:opacity-50',
  secondary: 'bg-surface text-tinta border border-garis hover:bg-kertas disabled:opacity-50',
  danger: 'bg-bahaya text-bahaya-text hover:brightness-95 disabled:opacity-50',
  ghost: 'text-tinta hover:bg-pandan-50 disabled:opacity-50',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', asChild = false, className, type = 'button', ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold',
        'transition-colors duration-150 ease-out select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pandan-600',
        'disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    />
  );
});
