import { describe, it, expect } from 'vitest';
import { formatDisplayAmount } from './amount-utils';

describe('formatDisplayAmount', () => {
  it('should format integer to exactly 2 decimal places', () => {
    expect(formatDisplayAmount(100)).toBe('100.00');
  });

  it('should format single decimal place to exactly 2 decimal places', () => {
    expect(formatDisplayAmount(100.5)).toBe('100.50');
  });

  it('should round to 2 decimal places', () => {
    expect(formatDisplayAmount(100.123456)).toBe('100.12');
  });

  it('should preserve integer part unchanged', () => {
    expect(formatDisplayAmount(12345.6789)).toBe('12345.68');
    const result = formatDisplayAmount(12345.6789);
    expect(Math.floor(parseFloat(result))).toBe(12345);
  });

  it('should handle zero correctly', () => {
    expect(formatDisplayAmount(0)).toBe('0.00');
  });

  it('should handle small amounts', () => {
    expect(formatDisplayAmount(0.1)).toBe('0.10');
    expect(formatDisplayAmount(0.01)).toBe('0.01');
  });
});
