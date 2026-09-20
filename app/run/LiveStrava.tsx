import { recentActivities } from '@/lib/strava';
import LiveStravaFeed from './LiveStravaFeed';

// Server component: renders the latest Strava activities, then the client feed keeps them fresh.
export default async function LiveStrava() {
  const activities = await recentActivities(12);
  if (!activities.length) return null;
  return <LiveStravaFeed initial={activities} />;
}
