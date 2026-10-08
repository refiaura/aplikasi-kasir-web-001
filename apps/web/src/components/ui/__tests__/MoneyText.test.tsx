import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MoneyText, formatRupiah } from '../MoneyText';

describe('formatRupiah', () => {
  it('memformat ribuan dengan titik', () => {
    expect(formatRupiah(12500)).toBe('Rp12.500');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(1000000)).toBe('Rp1.000.000');
  });

  it('nilai negatif memakai minus U+2212', () => {
    expect(formatRupiah(-5000)).toBe('−Rp5.000');
  });

  it('menerima bigint', () => {
    expect(formatRupiah(9007199254740993n)).toBe('Rp9.007.199.254.740.993');
  });

  it('tanpa desimal', () => {
    expect(formatRupiah(99.9)).toBe('Rp99');
  });
});

describe('MoneyText', () => {
  it('merender dengan angka tabular', () => {
    render(<MoneyText value={45000} />);
    const el = screen.getByText('Rp45.000');
    expect(el).toBeDefined();
    expect(el.className).toContain('tabular-nums');
  });
});
