import { describe, expect, it } from 'vitest';
import { matchTracklist, normalizeName, parseLine, parseTracklist, similarity } from './tracklist';
import type { Track } from './types';

describe('parseLine', () => {
  it('timestamped lines with en dash and remix', () => {
    expect(parseLine('0:00 Bicep – Glue (Extended Mix)')).toMatchObject({
      artist: 'Bicep',
      title: 'Glue',
      remix: 'Extended Mix',
      timestamp: 0,
      isId: false,
    });
    expect(parseLine('[1:02:15] Four Tet - Baby')).toMatchObject({
      artist: 'Four Tet',
      title: 'Baby',
      timestamp: 3735,
    });
  });
  it('numbered lists and bullets', () => {
    expect(parseLine('12. Overmono - So U Kno')).toMatchObject({
      artist: 'Overmono',
      title: 'So U Kno',
    });
    expect(parseLine("3) Fred again.. - Marea (we've lost dancing)")).toMatchObject({
      artist: 'Fred again..',
      title: "Marea (we've lost dancing)",
      remix: null,
    });
    expect(parseLine('- Skee Mask - Rev8617')).toMatchObject({
      artist: 'Skee Mask',
      title: 'Rev8617',
    });
  });
  it('1001tracklists copy with labels and w/ markers', () => {
    expect(parseLine('05. Peggy Gou - It Goes Like (Nanana) [XL]')).toMatchObject({
      artist: 'Peggy Gou',
      title: 'It Goes Like (Nanana)',
    });
    expect(parseLine('w/ Daft Punk - One More Time [Virgin]')).toMatchObject({
      artist: 'Daft Punk',
      title: 'One More Time',
    });
    expect(parseLine('07. ID - ID')).toMatchObject({ isId: true });
    expect(parseLine('ID - ID')?.isId).toBe(true);
  });
  it('square-bracket remixes', () => {
    expect(parseLine('Bicep - Apricots [Overmono Remix]')).toMatchObject({
      title: 'Apricots',
      remix: 'Overmono Remix',
    });
  });
  it('skips blanks and headers', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('Tracklist')).toBeNull();
    expect(parseTracklist('a - b\n\nnot a line\nc - d').length).toBe(2);
  });
});

describe('normalizeName', () => {
  it('unifies feat, &, brackets and case', () => {
    expect(normalizeName('Disclosure feat. Sam Smith')).toBe('disclosure sam smith');
    expect(normalizeName('Disclosure & Sam Smith')).toBe('disclosure sam smith');
    expect(normalizeName('Glue (Extended Mix)')).toBe('glue');
    expect(normalizeName('Éclair')).toBe('eclair');
  });
  it('similarity is symmetric and 1 on identity', () => {
    expect(similarity('bicep glue', 'bicep glue')).toBe(1);
    expect(similarity('bicep glue', 'bicep glu')).toBeCloseTo(
      similarity('bicep glu', 'bicep glue'),
    );
    expect(similarity('bicep', 'overmono')).toBeLessThan(0.3);
  });
});

describe('matchTracklist', () => {
  const t = (id: string, artist: string, title: string): Track => ({
    id,
    sourceId: id,
    artist,
    title,
    camelot: '8A',
    bpm: 124,
    durationS: 300,
    energy: null,
    rating: null,
    tags: [],
  });
  const lib = [
    t('1', 'Bicep', 'Glue'),
    t('2', 'Disclosure feat. Sam Smith', 'Latch (Extended Mix)'),
    t('3', 'Overmono', 'So U Kno'),
  ];
  it('matches through feat/remix noise and flags the rest', () => {
    const lines = parseTracklist(
      [
        '0:00 Bicep – Glue (Original Mix)',
        '5:10 Disclosure & Sam Smith - Latch',
        '9:00 ID - ID',
        '12:00 Nobody - Nothing Here',
      ].join('\n'),
    );
    const m = matchTracklist(lines, lib);
    expect(m.map((x) => x.status)).toEqual(['matched', 'matched', 'id', 'missing']);
    expect(m[0].track?.id).toBe('1');
    expect(m[1].track?.id).toBe('2');
  });
});

describe('tracklists copied out of DJ software', () => {
  const t = (id: string, artist: string, title: string, location?: string): Track => ({
    id,
    sourceId: id,
    artist,
    title,
    camelot: '8A',
    bpm: 124,
    durationS: 300,
    energy: null,
    rating: null,
    tags: [],
    location,
  });
  const lib = [
    t('glue', 'Bicep', 'Glue', '/Users/dj/Music/Bicep - Glue.mp3'),
    t('horizon', 'Artbat', 'Horizon - Extended Mix', '/Users/dj/Music/artbat_horizon.aiff'),
    t('latch', 'Disclosure, Sam Smith', 'Latch'),
    t('pacific', '808 State', 'Pacific State'),
    t('jp', '坂本龍一', '戦場のメリークリスマス'),
    t('ru', 'Кино', 'Группа крови'),
    t('drugs', 'Mau P', 'Drugs From Amsterdam'),
  ];
  const ids = (text: string) =>
    matchTracklist(parseTracklist(text), lib).map((m) => (m.track ? m.track.id : m.status));

  it('reads a rekordbox history export (tab-separated with a header)', () => {
    const txt = [
      '#\tArtwork\tTrack Title\tArtist\tAlbum\tGenre\tBPM\tRating\tTime\tKey\tDate Added',
      '1\t\tHorizon - Extended Mix\tArtbat\t\tMelodic House\t124.00\t\t6:12\t8A\t2026-09-01',
      '2\t\tGlue\tBicep\t\tElectronica\t124.00\t\t4:25\t8A\t2026-09-01',
    ].join('\r\n');
    expect(ids(txt)).toEqual(['horizon', 'glue']);
  });

  it('survives a UTF-16 export read as UTF-8', () => {
    const utf16ish = '\uFEFF#\tTrack Title\tArtist\n1\tGlue\tBicep\n'.split('').join('\u0000');
    expect(ids(utf16ish)).toEqual(['glue']);
  });

  it('reads tab rows without a header, whichever column comes first', () => {
    expect(ids('1\tGlue\tBicep\t124.00\t8A\n2\tMau P\tDrugs From Amsterdam\t126\t8A')).toEqual([
      'glue',
      'drugs',
    ]);
  });

  it('reads CSV with a header, like KeyCrate’s own export', () => {
    const csv =
      'position,artist,title,key,bpm\n1,Bicep,Glue,8A,124\n2,"Disclosure, Sam Smith",Latch,8A,122\n';
    expect(ids(csv)).toEqual(['glue', 'latch']);
  });

  it('reads M3U8 and matches by file path first', () => {
    const m3u = [
      '#EXTM3U',
      '#PLAYLIST:Friday',
      '#EXTINF:265,Bicep - Glue',
      '/Users/dj/Music/Bicep - Glue.mp3',
      '#EXTINF:372,Horizon',
      'file://localhost/Users/dj/Music/artbat_horizon.aiff',
      'C:\\Music\\Mau P - Drugs From Amsterdam.mp3',
    ].join('\n');
    expect(ids(m3u)).toEqual(['glue', 'horizon', 'drugs']);
  });

  it('reads a rekordbox playlist XML in playlist order', () => {
    const xml = `<DJ_PLAYLISTS><COLLECTION Entries="2">
      <TRACK TrackID="7" Name="Glue" Artist="Bicep" Location="file://localhost/Users/dj/Music/Bicep%20-%20Glue.mp3"/>
      <TRACK TrackID="9" Name="Latch" Artist="Disclosure &amp; Sam Smith"/>
    </COLLECTION><PLAYLISTS><NODE Type="0" Name="ROOT"><NODE Name="Set" Type="1" Entries="2">
      <TRACK Key="9"/><TRACK Key="7"/>
    </NODE></NODE></PLAYLISTS></DJ_PLAYLISTS>`;
    expect(ids(xml)).toEqual(['latch', 'glue']);
  });

  it('keeps non-Latin names, zero-padded numbering, key/BPM tags and numeric artists', () => {
    expect(
      ids(
        [
          '坂本龍一 - 戦場のメリークリスマス',
          'Кино - Группа крови',
          '01 Bicep - Glue',
          '#2 Bicep - Glue',
          'Mau P - Drugs From Amsterdam 8A 126',
          'Mau P - Drugs From Amsterdam (8A)',
          '808 State - Pacific State',
          'Glue - Bicep',
        ].join('\n'),
      ),
    ).toEqual(['jp', 'ru', 'glue', 'glue', 'drugs', 'drugs', 'pacific', 'glue']);
    expect(parseLine('Mau P - Drugs From Amsterdam 8A 126')?.title).toBe('Drugs From Amsterdam');
    expect(parseLine('808 State - Pacific State')?.artist).toBe('808 State');
  });

  it('offers the closest track when a line falls short', () => {
    const [m] = matchTracklist(parseTracklist('Bicep - Apricots'), lib);
    expect(m.status).toBe('missing');
    expect(m.candidate?.id).toBe('glue');
  });
});
