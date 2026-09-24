// One-time: register (or inspect / remove) the Strava webhook subscription for the deployed site.
// Reads STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN from .env.local.
//   node scripts/strava-subscribe.mjs create https://vitaegis.com
//   node scripts/strava-subscribe.mjs list
//   node scripts/strava-subscribe.mjs delete <id>
import { readFileSync } from 'node:fs';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const {
  STRAVA_CLIENT_ID: id,
  STRAVA_CLIENT_SECRET: secret,
  STRAVA_VERIFY_TOKEN: verify,
} = process.env;
if (!id || !secret || !verify)
  throw new Error(
    'Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_VERIFY_TOKEN in .env.local',
  );

const URL_ = 'https://www.strava.com/api/v3/push_subscriptions';
const [cmd = 'list', arg] = process.argv.slice(2);
const creds = `client_id=${id}&client_secret=${secret}`;

let res;
if (cmd === 'create') {
  if (!arg) throw new Error('Pass the site origin, e.g. https://vitaegis.com');
  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    callback_url: `${arg.replace(/\/$/, '')}/api/strava/webhook`,
    verify_token: verify,
  });
  res = await fetch(URL_, { method: 'POST', body });
} else if (cmd === 'delete') {
  res = await fetch(`${URL_}/${arg}?${creds}`, { method: 'DELETE' });
} else {
  res = await fetch(`${URL_}?${creds}`);
}
console.log(res.status, await res.text());
