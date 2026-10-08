import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberPad } from '../NumberPad';

describe('NumberPad', () => {
  it('memancarkan digit yang ditekan', async () => {
    const onInput = vi.fn();
    const user = userEvent.setup();
    render(<NumberPad onInput={onInput} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    expect(onInput).toHaveBeenNthCalledWith(1, '1');
    expect(onInput).toHaveBeenNthCalledWith(2, '0');
  });

  it('tombol hapus memanggil onDelete', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<NumberPad onInput={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('nonaktif saat disabled', async () => {
    const onInput = vi.fn();
    const user = userEvent.setup();
    render(<NumberPad onInput={onInput} onDelete={vi.fn()} disabled />);
    await user.click(screen.getByRole('button', { name: '5' }));
    expect(onInput).not.toHaveBeenCalled();
  });
});
