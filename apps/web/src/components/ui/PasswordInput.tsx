import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from './Input';

/** Input kata sandi dengan tombol tampil/sembunyi. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'trailing'>>(
  function PasswordInput(props, ref) {
    const [show, setShow] = useState(false);
    return (
      <Input
        ref={ref}
        type={show ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-pressed={show}
            className="flex h-10 w-10 items-center justify-center rounded-[8px] text-tinta-muted hover:bg-kertas hover:text-tinta"
          >
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        }
        {...props}
      />
    );
  },
);
