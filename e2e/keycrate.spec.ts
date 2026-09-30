import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/* Smoke: import the sample XML fixture, build a 5-track set, export rekordbox XML. */

test('import a rekordbox XML, build a five-track set, export it', async ({ page, isMobile }) => {
  await page.goto('/keycrate');
  await expect(page.getByRole('heading', { name: 'KeyCrate' })).toBeVisible();

  await page
    .getByTestId('kc-file')
    .setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
  await expect(page.getByTestId('kc-toast')).toContainText('Imported 24 tracks');
  await expect(page.getByTestId('kc-library')).toContainText('Glue');

  // Filter to one key from the wheel, then clear it.
  await page.getByRole('button', { name: '8A, A minor' }).click();
  await expect(page.getByTestId('kc-library').getByTestId('kc-track')).toHaveCount(5);
  await page.getByRole('button', { name: 'Clear key filter' }).click();

  // Search and tap five tracks into the set.
  const search = page.getByLabel('Search library');
  for (const title of ['Glue', 'Baby', 'Latch', 'Rev8617', 'Nanana']) {
    await search.fill(title);
    await page.getByTestId('kc-track').first().click();
  }
  await search.fill('');

  const openSheet = async () => {
    if (isMobile) await page.getByTestId('kc-open-sheet').click();
  };
  await openSheet();
  await expect(page.getByTestId('kc-set-row')).toHaveCount(5);
  await expect(page.getByTestId('kc-transition')).toHaveCount(4);
  // Glue (8A) into Baby (8B) is the relative major.
  await expect(page.getByTestId('kc-transition').first()).toContainText('Relative');
  await expect(page.getByTestId('kc-suggestions')).toBeVisible();
  await expect(page.getByTestId('kc-suggestion').first()).toBeVisible();

  // Undo removes the last track, redo brings it back.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('kc-set-row')).toHaveCount(4);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByTestId('kc-set-row')).toHaveCount(5);

  await page.getByTestId('kc-set-name').fill('Smoke set');
  await page.getByTestId('kc-save').click();
  await expect(page.getByTestId('kc-toast')).toContainText('Saved “Smoke set”');

  await page.getByTestId('kc-export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('kc-export-xml').click(),
  ]);
  expect(download.suggestedFilename()).toBe('Smoke_set.xml');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  const xml = Buffer.concat(chunks).toString('utf8');
  expect(xml).toContain('<NODE Name="Smoke set" Type="1"');
  expect(xml.match(/<TRACK Key="\d+"\/>/g)?.length).toBe(5);
  expect(xml).toContain('TrackID="1"');
});

test('selecting a playlist song suggests what follows it and inserts under it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The Next track list sits beside the playlist on desktop');
  await page.goto('/keycrate');
  await page
    .getByTestId('kc-file')
    .setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
  await expect(page.getByTestId('kc-toast')).toContainText('Imported 24 tracks');

  const search = page.getByLabel('Search library');
  for (const title of ['Glue', 'Baby', 'Latch']) {
    await search.fill(title);
    await page.getByTestId('kc-track').first().click();
  }
  await search.fill('');

  const rows = page.getByTestId('kc-playlist-row');
  await expect(rows).toHaveCount(3);

  // Pick the first song: suggestions now follow Glue.
  await rows.nth(0).getByRole('button', { name: 'Build after Glue' }).click();
  await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'true');
  const suggestions = page.getByTestId('kc-suggestions');
  await expect(suggestions).toContainText('After Glue');

  // A pick lands right under Glue and becomes the new selection, so picks chain.
  const pick = suggestions.getByTestId('kc-suggestion').first();
  const label = (await pick.getAttribute('aria-label')) ?? '';
  const title = label.replace(/^Add .+? – /, '').replace(/:.*$/, '');
  await pick.click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toContainText(title);
  await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(rows.nth(3)).toContainText('Latch');

  // Back to end: suggestions follow the last track again.
  await page.getByTestId('kc-anchor-clear').click();
  await expect(suggestions).not.toContainText('After Glue');
  await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'false');
});

/** A short silent 8 kHz mono WAV, so playback runs through to the end quickly. */
function silentWav(seconds: number): Buffer {
  const rate = 8000;
  const data = Math.round(rate * seconds);
  const b = Buffer.alloc(44 + data);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write('data', 36);
  b.writeUInt32LE(data, 40);
  b.fill(128, 44); // 8-bit silence
  return b;
}

test('when a playlist song ends, the next one plays', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Playback is the same on phones; the playlist layout differs');
  await page.goto('/keycrate');
  await page
    .getByTestId('kc-file')
    .setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
  await expect(page.getByTestId('kc-toast')).toContainText('Imported 24 tracks');

  const search = page.getByLabel('Search library');
  for (const title of ['Glue', 'Baby']) {
    await search.fill(title);
    await page.getByTestId('kc-track').first().click();
  }
  await search.fill('');

  // The folder input only takes a directory, so write the two songs into one first.
  const dir = test.info().outputPath('music');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'Bicep - Glue.wav'), silentWav(1));
  writeFileSync(path.join(dir, 'Four Tet - Baby.wav'), silentWav(1));
  await page.getByTestId('kc-audio-files').setInputFiles(dir);
  await expect(page.getByTestId('kc-toast')).toContainText('Linked 2 audio files');

  const rows = page.getByTestId('kc-playlist-row');
  await rows.nth(0).getByRole('button', { name: 'Play Glue' }).click();
  const bar = page.getByTestId('kc-now-playing');
  await expect(bar).toContainText('Glue');
  // Glue is one second long; Baby follows without a click.
  await expect(bar).toContainText('Baby', { timeout: 10_000 });
  await expect(rows.nth(1).getByRole('button', { name: 'Pause Baby' })).toBeVisible();
});

/** An ID3v2.4 tag with key and BPM, as rekordbox or Mixed In Key write it. */
function id3Tag(key: string, bpm: string): Buffer {
  const frame = (id: string, text: string) => {
    const body = Buffer.concat([Buffer.from([3]), Buffer.from(text, 'utf8')]);
    const head = Buffer.alloc(10);
    head.write(id, 0, 'ascii');
    head.writeUInt32BE(body.length, 4);
    return Buffer.concat([head, body]);
  };
  const frames = Buffer.concat([frame('TKEY', key), frame('TBPM', bpm)]);
  const n = frames.length;
  const head = Buffer.from([
    0x49,
    0x44,
    0x33,
    4,
    0,
    0,
    (n >> 21) & 0x7f,
    (n >> 14) & 0x7f,
    (n >> 7) & 0x7f,
    n & 0x7f,
  ]);
  return Buffer.concat([head, frames]);
}

/** silentWav with an "id3 " chunk after the audio. */
function taggedWav(key: string, bpm: string): Buffer {
  const wav = silentWav(0.1);
  const tag = id3Tag(key, bpm);
  const chunk = Buffer.alloc(8);
  chunk.write('id3 ', 0, 'ascii');
  chunk.writeUInt32LE(tag.length, 4);
  const pad = tag.length & 1 ? Buffer.from([0]) : Buffer.alloc(0);
  const out = Buffer.concat([wav, chunk, tag, pad]);
  out.writeUInt32LE(out.length - 8, 4);
  return out;
}

test('songs in a linked folder that the library lacks are added to it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Same flow on phones');
  await page.goto('/keycrate');
  await page
    .getByTestId('kc-file')
    .setInputFiles(path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml'));
  await expect(page.getByTestId('kc-toast')).toContainText('Imported 24 tracks');

  const dir = test.info().outputPath('usb');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'Bicep - Glue.wav'), silentWav(0.1)); // already in the library
  writeFileSync(path.join(dir, 'Nobody - Fresh Cut.wav'), taggedWav('Am', '126'));
  writeFileSync(path.join(dir, '5B - 122 - Somebody - Night Drive.wav'), silentWav(0.1));
  await page.getByTestId('kc-audio-files').setInputFiles(dir);
  await expect(page.getByTestId('kc-toast')).toContainText('Added 2 songs from usb to the library');

  const library = page.getByTestId('kc-library');
  const search = page.getByLabel('Search library');
  await search.fill('Fresh Cut');
  // Key and BPM come from the file's ID3 tag.
  await expect(library.getByTestId('kc-track')).toHaveCount(1);
  await expect(library.getByTestId('kc-track').first()).toContainText('8A');
  await expect(library.getByTestId('kc-track').first()).toContainText('126');
  await search.fill('Night Drive');
  // Key and BPM come from the file name.
  await expect(library.getByTestId('kc-track').first()).toContainText('5B');
  await expect(library.getByTestId('kc-track').first()).toContainText('122');
});

/** 40 s mono WAV: a 126 BPM kick over a sustained A minor chord, with no tags. */
function songWav(): Buffer {
  const rate = 22050;
  const n = rate * 40;
  const data = Buffer.alloc(n * 2);
  const period = (60 / 126) * rate;
  const notes = [110, 220, 261.63, 329.63];
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let s = 0;
    for (const f of notes) s += Math.sin(2 * Math.PI * f * t) / notes.length;
    const since = (i % period) / rate;
    s = 0.4 * s + 0.6 * Math.sin(2 * Math.PI * 60 * since) * Math.exp(-since * 40);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

test('key and BPM are detected for an untagged WAV', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Same flow on phones');
  await page.goto('/keycrate');
  const dir = test.info().outputPath('usb');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'Studio - Late Session.wav'), songWav());
  await page.getByTestId('kc-audio-files').setInputFiles(dir);
  await expect(page.getByTestId('kc-toast')).toContainText(
    'Detected key and BPM for 1 of 1 songs',
    {
      timeout: 30_000,
    },
  );
  const row = page.getByTestId('kc-library').getByTestId('kc-track').first();
  await expect(row).toContainText('Late Session');
  await expect(row).toContainText('8A');
  await expect(row).toContainText('126');
});

/* Paywall: off in tests (no KEYCRATE_STRIPE_PRICE_ID), so the access answer is mocked here. */

test('paywall: an ended free day shows the subscribe wall, a running one a banner', async ({
  page,
}) => {
  let answer = { enabled: true, state: 'expired', trialEndsAt: null as string | null };
  await page.route('**/api/keycrate/access', (route) =>
    route.fulfill({ json: { canManage: false, ...answer } }),
  );

  await page.goto('/keycrate');
  await expect(page.getByTestId('kc-wall')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your free day is over' })).toBeVisible();
  await expect(page.getByTestId('kc-subscribe')).toContainText('$3.33/month');
  await expect(page.getByRole('heading', { name: 'KeyCrate', exact: true })).toHaveCount(0);

  answer = {
    enabled: true,
    state: 'trial',
    trialEndsAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  };
  await page.reload();
  await expect(page.getByTestId('kc-trial-banner')).toContainText(/[45]h \d+m left/);
  await expect(page.getByRole('heading', { name: 'KeyCrate', exact: true })).toBeVisible();

  answer = { enabled: true, state: 'anonymous', trialEndsAt: null };
  await page.reload();
  await expect(page.getByTestId('kc-wall')).toContainText('24 hours free');
});
