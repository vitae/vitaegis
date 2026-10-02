import { describe, expect, it } from 'vitest';
import { loudestWindow } from './audio-peak';

describe('loudestWindow', () => {
  it('finds the loud, punchy stretch in a quiet track', () => {
    const rate = 4000;
    const secs = 60;
    const x = new Float32Array(rate * secs);
    for (let i = 0; i < x.length; i++) {
      const t = i / rate;
      const quiet = 0.05 * Math.sin(2 * Math.PI * 110 * t);
      // A pulsing drop from 32s to 40s.
      const drop =
        t >= 32 && t < 40 ? 0.8 * Math.sin(2 * Math.PI * 55 * t) * (Math.floor(t * 4) % 2) : 0;
      x[i] = quiet + drop;
    }
    const start = loudestWindow(x, rate, 4.5, 5);
    expect(start).toBeGreaterThanOrEqual(31.5);
    expect(start).toBeLessThanOrEqual(35.6);
  });

  it('stays inside the track for short files', () => {
    const x = new Float32Array(4000 * 6).fill(0.1);
    const start = loudestWindow(x, 4000, 4.5);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(start + 4.5).toBeLessThanOrEqual(6.01);
  });
});
