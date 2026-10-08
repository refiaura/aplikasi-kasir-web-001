import { Delete } from 'lucide-react';
import { cn } from '../../lib/cn';

interface NumberPadProps {
  onInput: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/** Papan angka untuk PIN dan input nominal. */
export function NumberPad({ onInput, onDelete, disabled = false }: NumberPadProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Papan angka">
      {keys.map((k, i) => {
        if (k === '') return <span key={`empty-${i}`} />;
        if (k === 'del') {
          return (
            <button
              key="del"
              type="button"
              disabled={disabled}
              onClick={onDelete}
              aria-label="Hapus"
              className={cn(
                'flex h-16 items-center justify-center rounded-[10px] border border-garis',
                'bg-surface text-tinta transition-colors duration-150 ease-out hover:bg-kertas',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <Delete size={22} />
            </button>
          );
        }
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onInput(k)}
            className={cn(
              'h-16 rounded-[10px] border border-garis bg-surface text-2xl font-bold text-tinta',
              'transition-colors duration-150 ease-out hover:bg-kertas active:bg-pandan-50',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
