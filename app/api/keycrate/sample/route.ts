import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

// The demo library: a small rekordbox export checked in under fixtures/.
export async function GET() {
  const file = path.join(process.cwd(), 'fixtures', 'keycrate-sample.xml');
  const xml = await readFile(file, 'utf8');
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
