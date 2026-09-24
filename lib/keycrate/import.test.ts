import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fallbackSourceId, parseCsv, parseCsvTracks, parseDuration } from './csv';
import { mergeTracks, needsAnalysis } from './merge';
import { decodeEntities, locationToPath, parseRekordboxXml } from './rekordbox';
import { pathToLocation, toCsv, toM3u8, toRekordboxXml } from './export';
import { DEFAULT_SETTINGS } from './types';

const fixture = readFileSync(join(process.cwd(), 'fixtures', 'keycrate-sample.xml'), 'utf8');

describe('rekordbox XML', () => {
  it('decodes entities and locations', () => {
    expect(decodeEntities('Tom &amp; Jerry &#39;live&#39; &#x26; more')).toBe(
      "Tom & Jerry 'live' & more",
    );
    expect(locationToPath('file://localhost/C:/Users/dj/Music/Bicep%20-%20Glue.mp3')).toBe(
      'C:/Users/dj/Music/Bicep - Glue.mp3',
    );
    expect(locationToPath('file://localhost/Users/dj/Music/a.aiff')).toBe('/Users/dj/Music/a.aiff');
  });

  it('parses the sample fixture with tempo and cue children', () => {
    const progress: number[] = [];
    const { tracks, playlists } = parseRekordboxXml(fixture, (p) => progress.push(p.parsed));
    expect(tracks.length).toBe(24);
    expect(progress[progress.length - 1]).toBe(24);
    const glue = tracks.find((t) => t.title === 'Glue')!;
    expect(glue).toMatchObject({
      id: 'rb:1',
      sourceId: '1',
      artist: 'Bicep',
      camelot: '8A',
      bpm: 124,
      durationS: 265,
      rating: 4,
    });
    expect(glue.tempo?.[0]).toEqual({ at: 0.123, bpm: 124 });
    expect(glue.cues?.length).toBe(2);
    expect(glue.cues?.[0]).toMatchObject({ name: 'Intro', num: 0 });
    expect(glue.location).toBe('/Users/dj/Music/Bicep - Glue.mp3');
    expect(tracks.find((t) => t.title === 'Untagged Promo')!.camelot).toBeNull();
    expect(playlists[0]).toMatchObject({ name: 'Warm up' });
    expect(playlists[0].trackIds.length).toBe(3);
  });

  it('keeps tracks whose attributes contain an unescaped >', () => {
    const xml = `<DJ_PLAYLISTS><COLLECTION Entries="3">
      <TRACK TrackID="1" Name="Up -> Down" Artist="X" AverageBpm="124.00" Tonality="Am"/>
      <TRACK TrackID="2" Name="Next" Artist="Y" AverageBpm="125.00" Tonality="Bm"><TEMPO Inizio="0.1" Bpm="125.00"/></TRACK>
      <TRACK TrackID="3" Name="Last" Artist="Z" AverageBpm="126.00" Tonality="Em"/>
    </COLLECTION></DJ_PLAYLISTS>`;
    const { tracks } = parseRekordboxXml(xml);
    expect(tracks.map((t) => t.title)).toEqual(['Up -> Down', 'Next', 'Last']);
    expect(tracks[1].tempo).toEqual([{ at: 0.1, bpm: 125 }]);
  });

  it('says what the file is instead of importing nothing', () => {
    expect(() =>
      parseRekordboxXml(
        '<?xml version="1.0"?><NML VERSION="19"><COLLECTION ENTRIES="1"></COLLECTION></NML>',
      ),
    ).toThrow(/Traktor/);
    expect(() => parseRekordboxXml('<?xml version="1.0"?><plist><dict/></plist>')).toThrow(
      /iTunes/,
    );
    expect(() => parseRekordboxXml('<foo/>')).toThrow(/Export Collection in xml format/);
    expect(() =>
      parseRekordboxXml('<DJ_PLAYLISTS><COLLECTION Entries="0"></COLLECTION></DJ_PLAYLISTS>'),
    ).toThrow(/No tracks/);
  });

  it('normalises whatever key spelling rekordbox used', () => {
    const { tracks } = parseRekordboxXml(fixture);
    expect(tracks.find((t) => t.title === 'Flat Spelling')!.camelot).toBe('2A');
    expect(tracks.find((t) => t.title === 'Open Key Spelling')!.camelot).toBe('8A');
  });
});

describe('CSV', () => {
  it('handles quotes, CRLF and semicolons', () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
    ]);
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('parses durations', () => {
    expect(parseDuration('5:32')).toBe(332);
    expect(parseDuration('1:02:15')).toBe(3735);
    expect(parseDuration('300')).toBe(300);
    expect(parseDuration('x')).toBeNull();
  });
  it('maps loose headers into tracks with stable ids', () => {
    const csv =
      'Artists,Track Title,Key,BPM,Genre,Length\nBicep,Glue,A min,124,Electronica,4:25\nOvermono,So U Kno,Ebm,130,Techno,5:10\n';
    const tracks = parseCsvTracks(csv);
    expect(tracks.length).toBe(2);
    expect(tracks[0]).toMatchObject({
      artist: 'Bicep',
      title: 'Glue',
      camelot: '8A',
      bpm: 124,
      durationS: 265,
    });
    expect(tracks[1].camelot).toBe('2A');
    expect(tracks[0].id).toBe(fallbackSourceId('Bicep', 'Glue', 265));
    expect(parseCsvTracks(csv)[0].id).toBe(tracks[0].id);
  });
});

describe('merge', () => {
  it('re-import updates by id and keeps energy and tags', () => {
    const { tracks: first } = parseRekordboxXml(fixture);
    first[0].energy = 7;
    first[0].tags = ['peak'];
    const { tracks: again } = parseRekordboxXml(
      fixture.replace('Name="Glue"', 'Name="Glue (2024 Remaster)"'),
    );
    const r = mergeTracks(first, again);
    expect(r.added).toBe(0);
    expect(r.updated).toBe(24);
    expect(r.tracks.length).toBe(24);
    const glue = r.tracks.find((t) => t.id === 'rb:1')!;
    expect(glue.title).toBe('Glue (2024 Remaster)');
    expect(glue.energy).toBe(7);
    expect(glue.tags).toEqual(['peak']);
  });
  it('merges CSV rows onto rekordbox rows by artist, title and duration', () => {
    const { tracks: first } = parseRekordboxXml(fixture);
    const csv = parseCsvTracks(
      'artist,title,key,bpm,duration\nBicep,Glue,8A,124,265\nNew Act,Brand New,5A,128,300\n',
    );
    const r = mergeTracks(first, csv);
    expect(r.added).toBe(1);
    expect(r.updated).toBe(1);
    expect(r.remapped.get(csv[0].id)).toBe('rb:1');
  });
  it('flags missing key or bpm', () => {
    const { tracks } = parseRekordboxXml(fixture);
    expect(tracks.filter(needsAnalysis).map((t) => t.title)).toEqual([
      'Untagged Promo',
      'Zero Bpm',
    ]);
  });
});

describe('exports', () => {
  const { tracks } = parseRekordboxXml(fixture);
  const set = tracks.slice(0, 3);

  it('rekordbox playlist XML references TrackIDs', () => {
    const xml = toRekordboxXml('Friday <set>', set);
    expect(xml).toContain('<NODE Name="Friday &lt;set&gt;" Type="1"');
    expect(xml).toContain('<TRACK Key="1"/>');
    expect(xml).toContain('TrackID="1"');
    expect(xml).toContain('Location="file://localhost/Users/dj/Music/Bicep%20-%20Glue.mp3"');
    expect(pathToLocation('C:\\Music\\a b.mp3')).toBe('file://localhost/C:/Music/a%20b.mp3');
  });
  it('m3u8 uses locations', () => {
    const m3u = toM3u8('x', set);
    expect(m3u.startsWith('#EXTM3U')).toBe(true);
    expect(m3u).toContain('#EXTINF:265,Bicep - Glue');
    expect(m3u).toContain('/Users/dj/Music/Bicep - Glue.mp3');
  });
  it('csv has transitions', () => {
    const csv = toCsv(set, DEFAULT_SETTINGS);
    const lines = csv.trim().split('\n');
    expect(lines.length).toBe(4);
    expect(lines[0]).toContain('transition');
    expect(lines[2]).toMatch(
      /,(Same key|Perfect 5th|Relative|Diagonal|Energy boost|Semitone lift|Third|Clash|No key),/,
    );
  });
});
