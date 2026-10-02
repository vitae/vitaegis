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
  const seg = (hasAudio: boolean) => ({ seconds: 7.5, hasAudio, caption: true });
  const g = montageFilter([seg(true), seg(false), seg(true)]);

  it('overlays each caption (inputs n..2n-1) on its clip', () => {
    expect(g).toContain('[3:v]format=rgba');
    expect(g).toContain('[5:v]format=rgba');
    expect(g).toContain('[b0][t0]overlay');
  });

  it('plays an uncaptioned intro at its own length and shifts the caption inputs', () => {
    const withIntro = montageFilter([
      { seconds: 4.5, hasAudio: true, caption: false },
      seg(true),
      seg(true),
    ]);
    expect(withIntro).toContain('[0:v]trim=0:4.5');
    expect(withIntro).not.toContain('[t0]');
    expect(withIntro).toContain('[3:v]format=rgba');
    expect(withIntro).toContain('[4:v]format=rgba');
    expect(withIntro).toContain('fade=t=out:st=18.90');
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
