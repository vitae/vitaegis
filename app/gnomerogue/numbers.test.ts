import { describe, expect, it } from 'vitest';
import { gearPoint, numbersRows } from './numbers';

describe('the numbers table', () => {
  it('runs the total from the expected column', () => {
    let total = 0;
    for (const row of numbersRows) {
      total += row.expected;
      expect(row.running, `${row.ability} at ${row.t}s`).toBe(total);
    }
  });

  it('tracks the Energy pool from regen, costs and Shank', () => {
    let energy = gearPoint.maxEnergy;
    let t = 0;
    for (const row of numbersRows) {
      expect(row.t).toBeGreaterThanOrEqual(t);
      energy = Math.min(gearPoint.maxEnergy, energy + (row.t - t) * gearPoint.energyPerSecond) - row.cost + row.gain;
      t = row.t;
      expect(Math.round(energy), `${row.ability} at ${row.t}s`).toBe(row.energy);
      expect(row.energy).toBeGreaterThanOrEqual(0);
    }
  });

  it('shows the expected value between non-crit and crit for single hits', () => {
    for (const row of numbersRows) {
      if (row.nonCrit === null || row.crit === null) continue;
      expect(row.expected).toBeGreaterThanOrEqual(row.nonCrit);
      expect(row.expected).toBeLessThanOrEqual(row.crit);
    }
  });

  it('lands the finisher after Kidney Shot ends', () => {
    const kidney = numbersRows.find((r) => r.ability === 'Kidney Shot')!;
    const finisher = numbersRows.find((r) => r.ability.includes('Eviscerate'))!;
    expect(finisher.t).toBeGreaterThan(kidney.t + 6);
  });
});
