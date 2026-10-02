import { describe, expect, it } from 'vitest';
import { watchZones } from './zones';

// 300 days drifting from 50 to 100, then a 30-day range of 90–110.
const base = Array.from({ length: 270 }, (_, i) => 50 + (i * 50) / 269);
const range = Array.from({ length: 30 }, (_, i) => (i % 2 ? 110 : 90));
const closes = [...base, ...range];

describe('watchZones', () => {
  it('flags a breakout at or above the 30-day high', () => {
    const z = watchZones(closes, 111);
    expect(z.status).toBe('breakout');
    expect(z.headline).toMatch(/30-day high/);
  });

  it('flags a breakdown at or below the 30-day low', () => {
    expect(watchZones(closes, 89).status).toBe('breakdown');
  });

  it('flags testing resistance within 3% under the 30-day high', () => {
    const z = watchZones(closes, 108);
    expect(z.status).toBe('testing-resistance');
    expect(z.resistance?.label).toBe('30-day high');
    expect(z.resistance?.distance).toBeCloseTo((110 / 108 - 1) * 100);
  });

  it('flags testing support within 3% over the nearest level below', () => {
    const z = watchZones(closes, 91.5);
    expect(z.status).toBe('testing-support');
    expect(z.support?.price).toBeLessThan(91.5);
  });

  it('treats a moving average as support above it and resistance below it', () => {
    const above = watchZones(closes, 109).levels.find((l) => l.label === '200-day average')!;
    const below = watchZones(closes, 60).levels.find((l) => l.label === '200-day average')!;
    expect(above.kind).toBe('support');
    expect(below.kind).toBe('resistance');
  });

  it('places the price inside the 30-day range', () => {
    expect(watchZones(closes, 100).rangePosition).toBeCloseTo(0.5);
  });
});
