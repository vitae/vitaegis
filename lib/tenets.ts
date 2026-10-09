// The tenet registry: every prescribed line of wisdom on the site, with one stable ID.
//
//   H-00.3   third prime directive of Health
//   H-01.02  second entry of dossier H-01 (Circadian rhythm)
//   S-11.01  first entry of dossier S-11
//
// IDs derive from lib/pillars.ts: the pillar letter, the dossier code (00 = the prime
// directives, P = the daily protocol), and the entry's position. Add new entries at the end
// of a dossier so existing IDs keep pointing at the same tenet. The same IDs appear on the
// pillar pages (as anchors), on every concept card, and in content_ingest.meta.tenets, so a
// post can always be traced back to the tenet it taught.

import { pillars, type PillarSlug } from './pillars';

export type PillarLetter = 'H' | 'S' | 'W';

export interface Tenet {
  /** Stable ID, e.g. "H-01.02". */
  id: string;
  pillar: PillarSlug;
  letter: PillarLetter;
  /** "H-00" for directives, "H-P" for the protocol, else the dossier code. */
  dossierCode: string;
  dossierTitle: string;
  /** The short label: the directive itself, a protocol time, or the entry's key. */
  title: string;
  /** The full text of the tenet. */
  text: string;
  /** Path on the site, with the anchor, e.g. "/health#H-01.02". */
  href: string;
}

export const LETTER: Record<PillarSlug, PillarLetter> = { health: 'H', stealth: 'S', wealth: 'W' };

const pad = (n: number) => String(n).padStart(2, '0');

/** The ID for entry `n` (1-based) of a dossier code. */
export const tenetId = (dossierCode: string, n: number) => `${dossierCode}.${pad(n)}`;

export const TENET_ID = /^[HSW]-(?:\d{2}|P)\.\d{2}$/;

let cache: Tenet[] | null = null;

/** Every tenet on the site, in page order. Built once. */
export function tenets(): Tenet[] {
  if (cache) return cache;
  const out: Tenet[] = [];
  for (const p of pillars) {
    const letter = LETTER[p.slug];
    const page = `/${p.slug}`;
    const dir = `${letter}-00`;
    p.directives.forEach((d, i) => {
      const id = tenetId(dir, i + 1);
      out.push({
        id,
        pillar: p.slug,
        letter,
        dossierCode: dir,
        dossierTitle: 'Prime directives',
        title: d,
        text: d,
        href: `${page}#${id}`,
      });
    });
    const pr = `${letter}-P`;
    p.protocol.forEach((e, i) => {
      const id = tenetId(pr, i + 1);
      out.push({
        id,
        pillar: p.slug,
        letter,
        dossierCode: pr,
        dossierTitle: p.protocolTitle,
        title: e.k,
        text: e.v,
        href: `${page}#${id}`,
      });
    });
    for (const d of p.dossiers) {
      d.entries.forEach((e, i) => {
        const id = tenetId(d.code, i + 1);
        out.push({
          id,
          pillar: p.slug,
          letter,
          dossierCode: d.code,
          dossierTitle: d.title,
          title: e.k,
          text: e.v,
          href: `${page}#${id}`,
        });
      });
    }
  }
  cache = out;
  return out;
}

export function findTenet(id: string): Tenet | undefined {
  const key = id.trim().toUpperCase();
  return tenets().find((t) => t.id === key);
}

/** Case-insensitive search over id, title and text, optionally within one pillar or dossier. */
export function searchTenets(opts: {
  q?: string;
  pillar?: PillarSlug;
  dossierCode?: string;
  limit?: number;
}): Tenet[] {
  const q = opts.q?.trim().toLowerCase();
  const code = opts.dossierCode?.trim().toUpperCase();
  return tenets()
    .filter((t) => !opts.pillar || t.pillar === opts.pillar)
    .filter((t) => !code || t.dossierCode === code)
    .filter(
      (t) =>
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.text.toLowerCase().includes(q) ||
        t.dossierTitle.toLowerCase().includes(q),
    )
    .slice(0, opts.limit ?? 50);
}
