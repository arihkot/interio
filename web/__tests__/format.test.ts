import { formatINR, compactNumber, percent } from '@/lib/format';

describe('format utilities', () => {
  it('formats INR correctly', () => {
    // Note: Node's Intl implementation can sometimes use different spacing (e.g. non-breaking space).
    // Let's use a regex or string replacement to check the core formatting values.
    const result = formatINR(1000000).replace(/\s/g, ' ');
    expect(result).toMatch(/₹\s?10,00,000/);
  });

  it('compacts numbers correctly', () => {
    expect(compactNumber(1500)).toBe('1.5K');
    expect(compactNumber(200000)).toBe('2L'); // en-IN uses Lakhs and Crores
  });

  it('formats percentages correctly', () => {
    expect(percent(0.85)).toBe('85%');
    expect(percent(1)).toBe('100%');
    expect(percent(0.005)).toBe('1%');
  });
});
