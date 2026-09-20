// Running routes from 2947 Kalakaua Ave (Diamond Head Beach Hotel), Honolulu.
// Distances and elevation come from ./geometry.ts (traced on OpenStreetMap data);
// the marathon shows the official 26.2 because the trace of the course runs a little long.
// Macrons (kahakō) are omitted on purpose: Jost has no precomposed macron vowels.

import { geometry } from './geometry';

export interface Cue { mi: number; text: string }
export interface PlanStep { title: string; body: string }
export interface Poi { label: string; lat: number; lon: number; color: string }
export interface RunRoute {
  slug: string;
  name: string;
  kicker: string;
  tagline: string;
  color: string;
  miles: number;
  officialMiles?: number;
  ascentFt: number;
  coords: [number, number, number][];
  profile: [number, number][];
  summary: string;
  marathonMiles: string;
  plan?: PlanStep[];
  cues: Cue[];
  mapsUrl: string;
  gpx: string;
  facts?: { label: string; value: string }[];
}

export const HOME = { lat: 21.2619, lon: -157.8203, label: '2947 Kalakaua Ave' };

const walk = (points: [number, number][]) => {
  const [o, ...rest] = points;
  const d = rest.pop()!;
  const p = (x: [number, number]) => `${x[0]},${x[1]}`;
  return (
    `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${p(o)}&destination=${p(d)}` +
    (rest.length ? `&waypoints=${encodeURIComponent(rest.map(p).join('|'))}` : '')
  );
};

const home: [number, number] = [21.2619, -157.8203];
const pakiMonsarrat: [number, number] = [21.26913, -157.81585];
const dhMonsarrat: [number, number] = [21.26978, -157.80782];
const makapuuKilauea: [number, number] = [21.27341, -157.80072];
const kilaueaHunakai: [number, number] = [21.2692, -157.7893];
const planetFitness: [number, number] = [21.2776, -157.7853];
const kalakauaKapahulu: [number, number] = [21.2715, -157.82276];
const kalakauaAlaMoana: [number, number] = [21.28555, -157.83294];
const magicIsland: [number, number] = [21.2838, -157.8466];
const dhKahala: [number, number] = [21.25897, -157.79814];
const lighthouse: [number, number] = [21.2568, -157.8065];
const kcc: [number, number] = [21.2696, -157.802];
const marathonStart: [number, number] = [21.29181, -157.85075];
const bandstand: [number, number] = [21.2686, -157.8209];

const g = (slug: string) => geometry[slug];

export const routes: RunRoute[] = [
  {
    slug: 'kahala',
    name: 'Kahala Errand',
    kicker: 'Warm-up · gym · lunch · bus home',
    tagline: 'Over the back of Diamond Head to Planet Fitness and Whole Foods.',
    color: '#ff00ff',
    miles: g('kahala').miles,
    ascentFt: g('kahala').ascentFt,
    coords: g('kahala').coords,
    profile: g('kahala').profile,
    summary:
      'The shortest legal route to Kahala Mall: up Paki and Monsarrat, around the mauka side of the crater past the KCC lot, then Kilauea Avenue all the way down. Planet Fitness and Whole Foods share the Ewa end of the mall, and TheBus Route 14 leaves from that corner and drops you at your own front door, so the groceries ride and you do not.',
    marathonMiles: 'Marathon miles 6.1–7.3 (Monsarrat) and Kilauea Ave, which the race reaches at mile 9.7',
    plan: [
      {
        title: '1 · Run 3.7 miles',
        body: 'Easy effort. The only hill is Monsarrat between miles 0.9 and 1.4; the last 1.5 miles on Kilauea are a gentle downhill. Bring: phone, HOLO card or $3 cash, a small lock, a dry shirt.',
      },
      {
        title: '2 · Planet Fitness, Kahala Mall',
        body: '4211 Waialae Ave, Ewa end of the mall · (808) 210-6830. Mon–Thu 5 am–11 pm, Fri 5 am–10 pm, Sat–Sun 7 am–7 pm.',
      },
      {
        title: '3 · Whole Foods Market Kahala',
        body: 'Same mall, Suite 2000, 100 m from the gym · (808) 738-0820 · 7 am–10 pm daily. Hot bar and poke counter for an early lunch, then the groceries.',
      },
      {
        title: '4 · Route 14 home',
        body: 'Board at the “Waialae Ave + Kilauea Ave” stop at the mall corner, direction St. Louis Heights (via Kalakaua). About 12 minutes to the “Kalakaua Ave + Elks Club” stop outside 2947. Roughly hourly: Saturdays and Sundays about :27 past the hour (7:27, 8:27, 9:27, 10:27, 11:27, 12:28, 1:28, 2:29…); weekdays 8:23, 9:19, 10:19, 11:17, 12:19, 1:11, 2:14, 3:09, then 6:16, 7:20, 8:13, 9:12 pm. From the Aug 2024 timetable; check DaBus2 or Google Maps for live times.',
      },
    ],
    cues: [
      { mi: 0.0, text: 'Out the door and Diamond Head-bound (east) on Kalakaua for two blocks.' },
      { mi: 0.2, text: 'At the Poni Moi Rd junction bear left (mauka) onto Paki Ave, the shaded top edge of Kapiolani Park.' },
      { mi: 0.9, text: 'Right onto Monsarrat Ave. Steady climb past the back of the zoo and the Monsarrat food trucks.' },
      { mi: 1.4, text: 'Monsarrat becomes Diamond Head Rd. Keep straight; the crater entrance tunnel is on your right.' },
      { mi: 1.7, text: 'Left onto Makapuu Ave, just past the KCC lower lot (the Saturday market lot is right here).' },
      { mi: 2.0, text: 'Right onto Kilauea Ave. Sidewalks both sides; it dips and curves 1.5 miles through Kaimuki and Kahala.' },
      { mi: 3.6, text: 'Kahala Mall at the Kilauea / Waialae corner. Planet Fitness and Whole Foods are 100 m in, on the Ewa end.' },
    ],
    mapsUrl: walk([home, pakiMonsarrat, dhMonsarrat, makapuuKilauea, kilaueaHunakai, planetFitness]),
    gpx: '/run/kahala.gpx',
    facts: [
      { label: 'Scenic variant', value: 'Go the other way round the crater: Diamond Head Rd along the ocean, Kahala Ave, then Hunakai St up to Kilauea. About 3.9 miles, and it is the road the bus brings you home on.' },
    ],
  },
  {
    slug: 'ten',
    name: 'The Ten',
    kicker: 'Long run · Waikiki, Magic Island, Diamond Head',
    tagline: 'The whole south shore in one loop: beach, harbor, crater, lighthouse.',
    color: '#00ff00',
    miles: g('ten').miles,
    ascentFt: g('ten').ascentFt,
    coords: g('ten').coords,
    profile: g('ten').profile,
    summary:
      'Flat and fast for the first six miles along Kalakaua and the Ala Moana beach path, a turnaround on the tip of Magic Island, then the Monsarrat climb and the full Diamond Head Rd horseshoe back to the ocean. Start before sunrise and the Waikiki sidewalks are yours; the lighthouse lookout at mile 9.4 is the reward.',
    marathonMiles: 'Marathon miles 4.9–8.7 in order, then the finish-side descent of miles 24.4–25.8',
    cues: [
      { mi: 0.0, text: 'Ewa (west) on Kalakaua along the Gold Coast: Kaimana Beach, the Natatorium, the Aquarium, Kapiolani Park on your right.' },
      { mi: 0.9, text: 'Cross Kapahulu Ave and stay on Kalakaua through Waikiki: Kuhio Beach, the Duke statue, the Royal Hawaiian.' },
      { mi: 1.9, text: 'Kalakaua ends; continue straight on Ala Moana Blvd over the Ala Wai bridge, Hilton lagoon then Ala Moana Center on your right.' },
      { mi: 2.7, text: 'Left into Ala Moana Regional Park at Atkinson Dr. Follow the beach path west.' },
      { mi: 3.4, text: 'Loop Magic Island: out the harbor side, around the lagoon at the tip, back along the beach.' },
      { mi: 4.4, text: 'Leave the park on Ala Moana Park Dr and retrace Ala Moana Blvd and Kalakaua through Waikiki.' },
      { mi: 6.3, text: 'At Kapahulu Ave bear left onto Monsarrat Ave: the marathon’s mile-7 hill, one mile up past the zoo and the food trucks.' },
      { mi: 7.3, text: 'Monsarrat becomes Diamond Head Rd. Around the back of the crater: monument entrance, KCC, Fort Ruger Park, then it swings right and drops.' },
      { mi: 8.9, text: 'Kahala Ave junction: stay right on Diamond Head Rd along the ocean.' },
      { mi: 9.4, text: 'Lighthouse and the surf lookouts. All downhill from here.' },
      { mi: 10.1, text: 'Fork left onto Kalakaua at Poni Moi Rd; home in two blocks.' },
    ],
    mapsUrl: walk([home, kalakauaAlaMoana, magicIsland, kalakauaKapahulu, dhMonsarrat, dhKahala, lighthouse, home]),
    gpx: '/run/ten.gpx',
    facts: [
      { label: 'Water', value: 'Fountains and restrooms at Kapiolani Park, Kuhio Beach, Ala Moana Beach Park and Magic Island; nothing on Diamond Head Rd after KCC.' },
      { label: 'Shorter', value: 'Skip the Magic Island loop and turn at the park entrance for 8.8 miles. Skip Ala Moana entirely and turn at the Ala Wai bridge for 7.4.' },
    ],
  },
  {
    slug: 'marathon',
    name: 'Honolulu Marathon',
    kicker: 'The official course · Sunday, December 13, 2026',
    tagline: 'Ala Moana to Hawaii Kai and back, finishing in Kapiolani Park.',
    color: '#ffff00',
    miles: g('marathon').miles,
    officialMiles: 26.2,
    ascentFt: g('marathon').ascentFt,
    coords: g('marathon').coords,
    profile: g('marathon').profile,
    summary:
      'Point to point. A 5:00 am fireworks start on Ala Moana Blvd, a lap of downtown and the Honolulu Hale Christmas lights, back through Waikiki, over the shoulder of Diamond Head, then the long straight out Kalanianaole Hwy to the Hawaii Kai turnaround at 17.4 and home the same way, with the decisive second climb of Diamond Head at mile 24. The course goes past your front door at about mile 25.8; the finish is half a mile further, by the Kapiolani Park bandstand. No time limit.',
    marathonMiles: 'Every one of them',
    cues: [
      { mi: 0.0, text: 'Start on Ala Moana Blvd fronting Ala Moana Beach Park; run Ewa (west) toward downtown.' },
      { mi: 1.8, text: 'Past Aloha Tower the boulevard is Nimitz Hwy; right onto Nuuanu Ave into Chinatown.' },
      { mi: 1.9, text: 'Right onto S King St: Iolani Palace, the Kamehameha statue at 2.25, Honolulu Hale lights.' },
      { mi: 2.5, text: 'Fork right onto Kapiolani Blvd at South St.' },
      { mi: 3.5, text: 'Right onto Piikoi St.' },
      { mi: 3.8, text: 'Left onto Ala Moana Blvd past Ala Moana Center and over the Ala Wai bridge.' },
      { mi: 4.9, text: 'Right onto Kalakaua Ave through Waikiki.' },
      { mi: 6.1, text: 'Fork left onto Monsarrat Ave around the zoo, then right onto Paki Ave.' },
      { mi: 7.5, text: 'Paki runs into Diamond Head Rd: the first climb, 90 feet in half a mile, up to the lighthouse lookout.' },
      { mi: 8.7, text: 'Stay left on Diamond Head Rd at the Kahala Ave junction; right onto 18th Ave (9.4); right onto Kilauea Ave (9.7).' },
      { mi: 11.0, text: 'Kilauea feeds onto Kalanianaole Hwy at Kahala Mall. Long straight out through Aina Haina, Niu and Kuliouou.' },
      { mi: 15.2, text: 'Left onto Hawaii Kai Dr around the marina.' },
      { mi: 17.0, text: 'Right onto Keahole St; turnaround at Hawaii Kai Towne Center, mile 17.4.' },
      { mi: 17.4, text: 'Back west on Kalanianaole Hwy, 4.4 miles of it.' },
      { mi: 22.2, text: 'Left onto Kealaolu Ave along the Waialae Country Club.' },
      { mi: 22.9, text: 'Right onto Kahala Ave: the mansions mile.' },
      { mi: 24.0, text: 'Kahala Ave merges into Diamond Head Rd: the second climb, 23.8 to 24.7.' },
      { mi: 25.6, text: 'Fork onto Kalakaua Ave; past 2947 at about 25.8.' },
      { mi: 26.2, text: 'Finish in Kapiolani Park near the bandstand.' },
    ],
    mapsUrl: walk([
      marathonStart,
      [21.31055, -157.86293],
      [21.29478, -157.84626],
      kalakauaKapahulu,
      [21.26017, -157.81818],
      [21.2673, -157.79948],
      [21.28456, -157.7176],
      [21.28302, -157.71531],
      [21.26964, -157.77876],
      dhKahala,
      bandstand,
    ]),
    gpx: '/run/marathon.gpx',
    facts: [
      { label: 'Race day', value: 'Sunday, December 13, 2026 · 5:00 am start · no time limit · honolulumarathon.org' },
      { label: 'Getting to the start', value: 'From 2947 it is 3.4 miles to the start on Ala Moana Blvd. Race-morning shuttles run from Waikiki; walking Kalakaua at 3:30 am with everyone else is the tradition.' },
      { label: 'Train on it', value: 'The Ten covers miles 4.9–8.7 and the finish descent. The Kahala Errand is Monsarrat and Kilauea. For the Hawaii Kai out-and-back, take Route 23 to Kahala Mall and run Kalanianaole early on a Sunday when the shoulder is quiet.' },
    ],
  },
  {
    slug: 'kcc',
    name: 'Saturday Market Loop',
    kicker: 'Diamond Head loop · KCC Farmers Market',
    tagline: 'The classic crater loop with breakfast at mile 1.8.',
    color: '#ffffff',
    miles: g('kcc').miles,
    ascentFt: g('kcc').ascentFt,
    coords: g('kcc').coords,
    profile: g('kcc').profile,
    summary:
      'Every Saturday 7:30 to 11 am the KCC lot on Diamond Head Rd fills with fifty-plus farm stands. Run there the mauka way (Paki, Monsarrat, the crater entrance), eat, then finish the loop down the ocean side past the lighthouse. Reverse it if you would rather carry the haul down Monsarrat than along the cliffs.',
    marathonMiles: 'Marathon miles 6.1–9.4 outbound and 24.4–25.8 inbound',
    plan: [
      { title: 'Market', body: 'KCC Farmers Market · 4303 Diamond Head Rd, parking lot C across from the crater entrance · Saturdays 7:30–11 am · run by the Hawaii Farm Bureau. Arrive at opening; by 9 the lines are long.' },
      { title: 'Carry', body: 'A light running vest handles coffee-and-pastry loads. For a real grocery run take Route 2 from the market to Kapahulu Ave (frequent, 24 hours) and walk the last mile, or run the loop reversed so the market is at mile 2.7.' },
    ],
    cues: [
      { mi: 0.0, text: 'East on Kalakaua two blocks; bear left onto Paki Ave at Poni Moi Rd.' },
      { mi: 0.9, text: 'Right onto Monsarrat Ave and climb.' },
      { mi: 1.4, text: 'Monsarrat becomes Diamond Head Rd; crater entrance on your right.' },
      { mi: 1.8, text: 'KCC Farmers Market, lot C on your right. Coffee, Dakota corn, fried green tomatoes, mochi.' },
      { mi: 2.0, text: 'Continue on Diamond Head Rd around the east side: Fort Ruger Park, then it swings right and descends.' },
      { mi: 2.7, text: 'Kahala Ave junction: stay right along the ocean.' },
      { mi: 3.5, text: 'Lighthouse lookout, then downhill.' },
      { mi: 4.3, text: 'Fork left onto Kalakaua at Poni Moi Rd; home.' },
    ],
    mapsUrl: walk([home, pakiMonsarrat, kcc, dhKahala, lighthouse, home]),
    gpx: '/run/kcc.gpx',
  },
  {
    slug: 'park',
    name: 'Park Shakeout',
    kicker: 'Easy · flat · Kapiolani Park perimeter',
    tagline: 'Recovery loop around the park, ocean on one side, banyans on the other.',
    color: '#ff3355',
    miles: g('park').miles,
    ascentFt: g('park').ascentFt,
    coords: g('park').coords,
    profile: g('park').profile,
    summary:
      'Dead flat. Kalakaua along the beach to the Kapahulu corner, up past the zoo on Monsarrat, back along Paki under the trees, and home. Add strides on the park grass and finish barefoot on the sand at Kaimana Beach.',
    marathonMiles: 'The final mile of the marathon, plus Monsarrat and Paki',
    cues: [
      { mi: 0.0, text: 'Ewa (west) on Kalakaua: Kaimana Beach, the Natatorium, the Aquarium.' },
      { mi: 0.8, text: 'Right onto Kapahulu Ave for one block, then right onto Monsarrat Ave past the zoo.' },
      { mi: 1.4, text: 'Right onto Paki Ave along the mauka edge of the park.' },
      { mi: 2.1, text: 'Paki ends at Poni Moi Rd; right onto Kalakaua and home.' },
    ],
    mapsUrl: walk([home, kalakauaKapahulu, pakiMonsarrat, home]),
    gpx: '/run/park.gpx',
  },
];

export const pois: Poi[] = [
  { label: '2947 Kalakaua', lat: 21.2619, lon: -157.8203, color: '#00ff00' },
  { label: 'Planet Fitness · Whole Foods', lat: 21.2776, lon: -157.7858, color: '#ff00ff' },
  { label: 'Bus 14 home', lat: 21.27835, lon: -157.78523, color: '#ff00ff' },
  { label: 'KCC market', lat: 21.2696, lon: -157.802, color: '#ffffff' },
  { label: 'Lighthouse lookout', lat: 21.2565, lon: -157.809, color: '#00ff00' },
  { label: 'Magic Island', lat: 21.2838, lon: -157.8466, color: '#00ff00' },
  { label: 'Marathon start', lat: 21.29181, lon: -157.85075, color: '#ffff00' },
  { label: 'Marathon finish', lat: 21.2686, lon: -157.8209, color: '#ffff00' },
  { label: 'Mile 17.4 turnaround', lat: 21.28302, lon: -157.71531, color: '#ffff00' },
];

export const paces = [
  { label: '8:00 /mi', min: 8 },
  { label: '8:30 /mi', min: 8.5 },
  { label: '9:00 /mi', min: 9 },
  { label: '9:30 /mi', min: 9.5 },
  { label: '10:00 /mi', min: 10 },
  { label: '10:30 /mi', min: 10.5 },
  { label: '11:00 /mi', min: 11 },
  { label: '12:00 /mi', min: 12 },
  { label: '13:00 /mi', min: 13 },
];

export function formatDuration(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
