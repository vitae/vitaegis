import { describe, expect, it } from 'vitest';
import { captionSvg, montageFilter } from './montage';

describe('captionSvg', () => {
  it('escapes text and colors the headline green', () => {
    const svg = captionSvg(['$10K <at> the low', 'R&D "notes"']);
    expect(svg).toContain('$10K &lt;at&gt; the low');
    expect(svg).toContain('R&amp;D &quot;notes&quot;');
    expect(svg.indexOf('#00FF00')).toBeLessThan(svg.indexOf('#FFFFFF'));
  });

  it('shrinks a long line to fit the frame', () => {
    const size = (svg: string) => Number(/font-size="(\d+)"/.exec(svg)![1]);
    expect(size(captionSvg(['Short']))).toBe(64);
    expect(size(captionSvg(['A much longer headline that would overflow']))).toBeLessThan(64);
  });
});

describe('montageFilter', () => {
  const g = montageFilter([{ hasAudio: true }, { hasAudio: false }, { hasAudio: true }], 7.5);

  it('overlays each caption (inputs n..2n-1) on its clip', () => {
    expect(g).toContain('[3:v]format=rgba');
    expect(g).toContain('[5:v]format=rgba');
    expect(g).toContain('[b0][t0]overlay');
  });

  it('fills a silent clip with generated silence', () => {
    expect(g).toContain('anullsrc=r=48000:cl=stereo,atrim=0:7.5[a1]');
    expect(g).not.toContain('[1:a]');
  });

  it('concatenates every scene and fades out at the end', () => {
    expect(g).toContain('[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1');
    expect(g).toContain('fade=t=out:st=21.90');
  });
});
