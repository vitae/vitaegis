import { NextRequest, NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteActivity, removeAthlete, syncActivity } from '@/lib/strava';

// Strava webhook: https://developers.strava.com/docs/webhooks/
// GET  = subscription validation (echo hub.challenge)
// POST = event; must answer 200 within 2 s, so the Strava fetch runs after the response.

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': p.get('hub.challenge') });
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

interface StravaEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  let event: StravaEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  after(async () => {
    try {
      if (event.object_type === 'activity') {
        if (event.aspect_type === 'delete') await deleteActivity(event.object_id);
        else await syncActivity(event.owner_id, event.object_id);
      } else if (event.object_type === 'athlete' && event.updates?.authorized === 'false') {
        await removeAthlete(event.owner_id);
      }
      revalidatePath('/run');
    } catch (err) {
      console.error('Strava webhook processing failed:', event, err);
    }
  });

  return NextResponse.json({ received: true });
}
