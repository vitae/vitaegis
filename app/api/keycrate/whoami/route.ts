import { NextRequest, NextResponse } from 'next/server';
import { publicOrigin } from '@/lib/keycrate/public-origin';

export const dynamic = 'force-dynamic';

/**
 * GET → the origin KeyCrate believes the visitor is on. Used to check the glowwitdaflow.com
 * proxy hands over enough for Checkout and the Customer Portal to return people to the right
 * host. Lists only the forwarding headers, never cookies or auth.
 */
export async function GET(req: NextRequest) {
  const forwarded: Record<string, string> = {};
  for (const [k, v] of req.headers) {
    if (
      /^(x-forwarded-|x-vercel-(forwarded|proxied|deployment)|forwarded$|via$|host$|origin$|referer$)/i.test(
        k,
      )
    )
      forwarded[k] = v;
  }
  return NextResponse.json({ origin: publicOrigin(req), forwarded });
}
