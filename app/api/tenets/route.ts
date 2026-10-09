import { NextRequest, NextResponse } from 'next/server';
import { findTenet, searchTenets, tenets } from '@/lib/tenets';

/**
 * The public tenet registry, so an ID printed on a card resolves to its source:
 *   /api/tenets?id=H-01.02
 *   /api/tenets?pillar=health&q=sunlight
 * Derived from lib/pillars.ts at build time; nothing here is private.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get('id');
  if (id) {
    const t = findTenet(id);
    return t
      ? NextResponse.json(t, { headers: { 'Cache-Control': 'public, max-age=3600' } })
      : NextResponse.json({ error: `No tenet ${id}` }, { status: 404 });
  }
  const pillar = sp.get('pillar');
  const list = searchTenets({
    q: sp.get('q') ?? undefined,
    pillar: pillar === 'health' || pillar === 'stealth' || pillar === 'wealth' ? pillar : undefined,
    dossierCode: sp.get('dossier') ?? undefined,
    limit: Math.min(500, Number(sp.get('limit') ?? 500)),
  });
  return NextResponse.json(
    { total: tenets().length, count: list.length, tenets: list },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
