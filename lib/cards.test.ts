import { describe, expect, it } from 'vitest';
import { cardSvg, reelFilter, wrapLines } from './cards';

describe('wrapLines', () => {
  it('keeps short text on one line', () => {
    expect(wrapLines('Sunlight first', 40, 800)).toEqual(['Sunlight first']);
  });
  it('wraps at the width and never splits a word', () => {
    const lines = wrapLines(
      'Sunlight in your eyes within an hour of waking. Every single day without exception.',
      40,
      500,
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(24);
    expect(lines.join(' ')).toBe(
      'Sunlight in your eyes within an hour of waking. Every single day without exception.',
    );
  });
  it('respects explicit line breaks', () => {
    expect(wrapLines('one\ntwo', 40, 800)).toEqual(['one', 'two']);
  });
});

describe('cardSvg', () => {
  const spec = {
    code: 'H-01',
    pillar: 'Health',
    title: 'Circadian <Rhythm>',
    lines: ['Sunlight in your eyes within an hour of waking.', 'Same wake time & bedtime.'],
    footer: 'vitaegis.com/health',
  };
  it('renders the kicker, title, points and footer, escaped', () => {
    const svg = cardSvg(spec, 'feed', 1, 4);
    expect(svg).toContain('H-01 · HEALTH');
    expect(svg).toContain('Circadian &lt;Rhythm&gt;');
    expect(svg).toContain('Same wake time &amp; bedtime.');
    expect(svg).toContain('vitaegis.com/health');
    expect(svg).toContain('2 / 4');
    expect(svg).toContain('width="1080" height="1350"');
  });
  it('uses the reel frame for reels and omits the counter for a single card', () => {
    const svg = cardSvg(spec, 'reel');
    expect(svg).toContain('width="1080" height="1920"');
    expect(svg).not.toContain('1 / 1');
  });
});

describe('reelFilter', () => {
  it('pushes in on every card, concatenates them, and adds silence', () => {
    const g = reelFilter(3, 4);
    expect(g).toContain('[0:v]scale=2160:3840,zoompan');
    expect(g).toContain('[2:v]scale');
    expect(g).toContain('concat=n=3:v=1:a=0[vc]');
    expect(g).toContain('anullsrc=r=48000:cl=stereo,atrim=0:12[a]');
    expect(g).toContain('fade=t=out:st=11.40:d=0.6[v]');
  });
});
