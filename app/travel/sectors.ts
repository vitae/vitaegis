// /travel — six sectors on one scope, every track out of Honolulu, flown on Alaska Airlines (with
// Hawaiian, now part of Alaska Air Group), American Airlines, and their oneworld / Mileage Plan
// partners. A routing with a connection is one track that flies the whole chain (see `via`). Fares
// are indicative lowest one-way economy prices seen on aggregators, September 2026 — a planning
// budget, not a quote. Region keys drive the sector selector and the scope framing.

import { greatCircleMiles, legMiles, type Airports, type Leg, type Overview } from './_radar/geo';

export interface Sector {
  key: string;
  label: string;
  /** HUD header when this sector is lit. */
  sector: string;
  blurb: string;
  overview: Overview;
  /** Accent for the sector card, when its tracks are colour-coded. */
  color?: string;
}

export const home = 'HNL';

/** Anything routed through Dallas–Fort Worth is drawn in this blue. */
export const DALLAS = 'DFW';
export const DALLAS_BLUE = '#2f9bff';
/** Every Asia-sector routing is drawn in this red. */
export const ASIA_RED = '#ff3b3b';

const sectorList: Sector[] = [
  {
    key: 'asia', label: 'Asia', sector: 'Pacific sector', color: ASIA_RED,
    blurb: 'Hawaiian flies the two nonstop doors, Tokyo and Seoul. Deeper in, JAL and Korean Air — both Alaska partners — carry the second leg.',
    overview: { lat: 24, lon: 170, dist: 4.4 },
  },
  {
    key: 'south-america', label: 'South America', sector: 'Andean sector',
    blurb: 'No nonstop exists. American’s Dallas hub is the door: one stop to Bogotá, Lima, Santiago, Buenos Aires and São Paulo, two to Rio.',
    overview: { lat: 2, lon: -105, dist: 4.4 },
  },
  {
    key: 'alaska', label: 'Alaska', sector: 'Arctic sector',
    blurb: 'Nonstop only: Alaska Airlines’ summer seasonal to Anchorage, straight up the Pacific. Nothing else flies it direct.',
    overview: { lat: 42, lon: -145, dist: 3.9 },
  },
  {
    key: 'dallas', label: 'Dallas', sector: 'Central sector', color: DALLAS_BLUE,
    blurb: 'American’s daily nonstop makes DFW the one-stop gateway to the East Coast, the Gulf, London and beyond.',
    overview: { lat: 30, lon: -122, dist: 4.2 },
  },
  {
    key: 'switzerland', label: 'Switzerland', sector: 'Alpine sector',
    blurb: 'Two stops, all oneworld: a mainland gateway on Alaska or American, British Airways across the Atlantic, then the short hop from London.',
    overview: { lat: 44, lon: -78, dist: 4.4 },
  },
  {
    key: 'reykjavik', label: 'Reykjavik', sector: 'North Atlantic sector',
    blurb: 'Icelandair is an Alaska partner. Seattle, New York and Boston put Keflavík one stop from Honolulu, and Europe one more.',
    overview: { lat: 50, lon: -95, dist: 4.2 },
  },
];

/** Framing when no sector is picked: Honolulu at centre, both continents on the lit face. */
export const worldOverview: Overview = { lat: 30, lon: -125, dist: 4.4 };

export const airports: Airports = {
  HNL: { code: 'HNL', city: 'Honolulu', country: 'Hawaiʻi', lat: 21.3187, lon: -157.9225, tz: 'Pacific/Honolulu', labelSide: 'right' },
  // Asia
  NRT: { code: 'NRT', city: 'Tokyo', country: 'Japan', lat: 35.772, lon: 140.3929, tz: 'Asia/Tokyo', labelSide: 'right', hue: ASIA_RED },
  ICN: { code: 'ICN', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407, tz: 'Asia/Seoul', labelSide: 'left', hue: ASIA_RED },
  PVG: { code: 'PVG', city: 'Shanghai', country: 'China', lat: 31.1443, lon: 121.8083, tz: 'Asia/Shanghai', labelSide: 'left', hue: ASIA_RED },
  BKK: { code: 'BKK', city: 'Bangkok', country: 'Thailand', lat: 13.69, lon: 100.7501, tz: 'Asia/Bangkok', labelSide: 'left', hue: ASIA_RED },
  SIN: { code: 'SIN', city: 'Singapore', country: 'Singapore', lat: 1.3644, lon: 103.9915, tz: 'Asia/Singapore', labelSide: 'left', minor: true, hue: ASIA_RED },
  DPS: { code: 'DPS', city: 'Denpasar', country: 'Bali', lat: -8.7482, lon: 115.1672, tz: 'Asia/Makassar', labelSide: 'right', hue: ASIA_RED },
  // Mainland gateways
  LAX: { code: 'LAX', city: 'Los Angeles', country: 'USA', lat: 33.9416, lon: -118.4085, tz: 'America/Los_Angeles', labelSide: 'left' },
  SEA: { code: 'SEA', city: 'Seattle', country: 'USA', lat: 47.4502, lon: -122.3088, tz: 'America/Los_Angeles', labelSide: 'left' },
  DFW: { code: 'DFW', city: 'Dallas–Fort Worth', country: 'USA', lat: 32.8998, lon: -97.0403, tz: 'America/Chicago', labelSide: 'right', hue: DALLAS_BLUE },
  ORD: { code: 'ORD', city: 'Chicago', country: 'USA', lat: 41.9742, lon: -87.9073, tz: 'America/Chicago', labelSide: 'left', minor: true },
  JFK: { code: 'JFK', city: 'New York', country: 'USA', lat: 40.6413, lon: -73.7781, tz: 'America/New_York', labelSide: 'right' },
  BOS: { code: 'BOS', city: 'Boston', country: 'USA', lat: 42.3656, lon: -71.0096, tz: 'America/New_York', labelSide: 'right', minor: true },
  MIA: { code: 'MIA', city: 'Miami', country: 'USA', lat: 25.7959, lon: -80.287, tz: 'America/New_York', labelSide: 'right' },
  // South America
  BOG: { code: 'BOG', city: 'Bogotá', country: 'Colombia', lat: 4.7016, lon: -74.1469, tz: 'America/Bogota', labelSide: 'right' },
  LIM: { code: 'LIM', city: 'Lima', country: 'Peru', lat: -12.0219, lon: -77.1143, tz: 'America/Lima', labelSide: 'left' },
  SCL: { code: 'SCL', city: 'Santiago', country: 'Chile', lat: -33.393, lon: -70.7858, tz: 'America/Santiago', labelSide: 'left' },
  EZE: { code: 'EZE', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lon: -58.5358, tz: 'America/Argentina/Buenos_Aires', labelSide: 'right' },
  GRU: { code: 'GRU', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lon: -46.4731, tz: 'America/Sao_Paulo', labelSide: 'left', minor: true },
  GIG: { code: 'GIG', city: 'Rio de Janeiro', country: 'Brazil', lat: -22.81, lon: -43.2506, tz: 'America/Sao_Paulo', labelSide: 'right' },
  // Alaska
  ANC: { code: 'ANC', city: 'Anchorage', country: 'Alaska', lat: 61.1743, lon: -149.9962, tz: 'America/Anchorage', labelSide: 'left' },
  // Europe
  LHR: { code: 'LHR', city: 'London', country: 'UK', lat: 51.47, lon: -0.4543, tz: 'Europe/London', labelSide: 'left' },
  CDG: { code: 'CDG', city: 'Paris', country: 'France', lat: 49.0097, lon: 2.5479, tz: 'Europe/Paris', labelSide: 'right', minor: true },
  CPH: { code: 'CPH', city: 'Copenhagen', country: 'Denmark', lat: 55.618, lon: 12.6508, tz: 'Europe/Copenhagen', labelSide: 'right', minor: true },
  ZRH: { code: 'ZRH', city: 'Zurich', country: 'Switzerland', lat: 47.4647, lon: 8.5492, tz: 'Europe/Zurich', labelSide: 'right' },
  GVA: { code: 'GVA', city: 'Geneva', country: 'Switzerland', lat: 46.2381, lon: 6.1089, tz: 'Europe/Zurich', labelSide: 'left', minor: true },
  KEF: { code: 'KEF', city: 'Reykjavik', country: 'Iceland', lat: 63.985, lon: -22.6056, tz: 'Atlantic/Reykjavik', labelSide: 'left' },
};

const routings: Leg[] = [
  // ── Asia ── Hawaiian nonstops, then JAL / Korean Air (Alaska Mileage Plan partners).
  { n: '01', region: 'asia', from: 'HNL', to: 'NRT', toLabel: 'NRT/HND', farePP: 200, time: 'Nonstop · ~8h', carriers: 'Hawaiian / Alaska · JAL (oneworld)', note: 'Hawaiian flies both Narita and Haneda. Visa-free 90 days in Japan.' },
  { n: '02', region: 'asia', from: 'HNL', to: 'ICN', farePP: 260, time: 'Nonstop · ~10.5h', carriers: 'Hawaiian / Alaska · Korean Air (Alaska partner)', note: 'The second door. Korean Air connects to all of Southeast Asia from here.' },
  { n: '03', region: 'asia', from: 'HNL', to: 'PVG', via: ['NRT'], farePP: 340, time: '1 stop · ~14h', carriers: 'Hawaiian → JAL', note: 'One oneworld ticket. 240-hour visa-free transit in China — carry the onward ticket.', flag: 'visa' },
  { n: '04', region: 'asia', from: 'HNL', to: 'BKK', via: ['NRT'], farePP: 330, time: '1 stop · ~17h', carriers: 'Hawaiian → JAL', note: 'Or via Seoul on Korean Air. Visa-free 30 days; file the TDAC arrival card.' },
  { n: '05', region: 'asia', from: 'HNL', to: 'SIN', via: ['NRT'], farePP: 380, time: '1 stop · ~17h', carriers: 'Hawaiian → JAL', note: 'JAL meets the Tokyo arrival bank with an evening Singapore departure.' },
  { n: '06', region: 'asia', from: 'HNL', to: 'DPS', via: ['ICN'], farePP: 420, time: '1 stop · ~19h', carriers: 'Hawaiian → Korean Air', note: 'Visa on arrival, ~$32. Buy the e-VOA ahead of time.', flag: 'visa' },

  // ── South America ── American, one stop through its Dallas hub.
  { n: '07', region: 'south-america', from: 'HNL', to: 'LIM', via: ['DFW'], farePP: 540, time: '1 stop · ~16h', carriers: 'American', note: 'American’s DFW–Lima nonstop. Lima is the door to Cusco.' },
  { n: '08', region: 'south-america', from: 'HNL', to: 'BOG', via: ['DFW'], farePP: 480, time: '1 stop · ~14h', carriers: 'American', note: 'Visa-free 90 days. Check-Mig form within 72h of arrival.' },
  { n: '09', region: 'south-america', from: 'HNL', to: 'SCL', via: ['DFW'], farePP: 600, time: '1 stop · ~18.5h', carriers: 'American', note: 'Overnight from Dallas. Santiago sits under the Andes wall — sit on the left.' },
  { n: '10', region: 'south-america', from: 'HNL', to: 'EZE', via: ['DFW'], farePP: 600, time: '1 stop · ~19h', carriers: 'American', note: 'American’s DFW–Buenos Aires nonstop. Overnight, land at dawn.' },
  { n: '11', region: 'south-america', from: 'HNL', to: 'GRU', via: ['DFW'], farePP: 580, time: '1 stop · ~18h', carriers: 'American', note: 'US passports need a Brazil e-visa since April 2025, ~$81.', flag: 'visa' },
  { n: '28', region: 'south-america', from: 'HNL', to: 'GIG', via: ['DFW', 'MIA'], farePP: 640, time: '2 stops · ~21h', carriers: 'American', note: 'American’s Rio flights leave from Miami, so it is Dallas then Miami then the overnight south. Same Brazil e-visa as São Paulo.', flag: 'visa' },

  // ── Alaska ── the one nonstop.
  { n: '12', region: 'alaska', from: 'HNL', to: 'ANC', farePP: 260, time: 'Seasonal nonstop · ~6h', carriers: 'Alaska Airlines (summer)', note: 'Summer only — the one nonstop between Hawaiʻi and Alaska. Off-season it is a Seattle connection.', flag: 'win' },

  // ── Dallas ── American’s hub.
  { n: '13', region: 'dallas', from: 'HNL', to: 'DFW', farePP: 240, time: 'Nonstop · ~7.5h', carriers: 'American', note: 'Daily, year-round. The one nonstop into the middle of the map.' },
  { n: '14', region: 'dallas', from: 'HNL', to: 'JFK', via: ['DFW'], farePP: 330, time: '1 stop · ~12h', carriers: 'American', note: 'Or Hawaiian’s nonstop to JFK — compare. LaGuardia is closer to Manhattan, same fare.' },
  { n: '15', region: 'dallas', from: 'HNL', to: 'MIA', via: ['DFW'], farePP: 320, time: '1 stop · ~11.5h', carriers: 'American', note: 'The feeder for the Caribbean and every South America track.' },
  { n: '16', region: 'dallas', from: 'HNL', to: 'ORD', via: ['DFW'], farePP: 300, time: '1 stop · ~11h', carriers: 'American', note: 'Hub to hub. Winter weather is the variable.' },
  { n: '17', region: 'dallas', from: 'HNL', to: 'LHR', via: ['DFW'], farePP: 620, time: '1 stop · ~18h', carriers: 'American · British Airways', note: 'One stop to London. Book the 787 or A350 on the Atlantic leg.', flag: 'win' },

  // ── Switzerland ── oneworld all the way: Alaska or American to the mainland, BA over the Atlantic and on to the Alps.
  { n: '18', region: 'switzerland', from: 'HNL', to: 'ZRH', via: ['LAX', 'LHR'], farePP: 720, time: '2 stops · ~21h', carriers: 'Alaska / Hawaiian → British Airways', note: 'BA’s LAX–London A380, then the 90-minute hop to Zurich. One ticket, bags checked through.' },
  { n: '19', region: 'switzerland', from: 'HNL', to: 'ZRH', via: ['DFW', 'LHR'], farePP: 700, time: '2 stops · ~21h', carriers: 'American → British Airways', note: 'The American routing. Three BA departures a day from Dallas give the most flexible connection.' },
  { n: '20', region: 'switzerland', from: 'HNL', to: 'GVA', via: ['DFW', 'LHR'], farePP: 720, time: '2 stops · ~21.5h', carriers: 'American → British Airways', note: 'For the ski side. Ski-season Saturdays double the fare; fly midweek.' },
  { n: '21', region: 'switzerland', from: 'HNL', to: 'GVA', via: ['SEA', 'LHR'], farePP: 740, time: '2 stops · ~22h', carriers: 'Alaska → British Airways', note: 'The northern routing — Seattle to London on BA, then Geneva.' },

  // ── Reykjavik ── Icelandair, an Alaska Mileage Plan partner.
  { n: '22', region: 'reykjavik', from: 'HNL', to: 'KEF', via: ['SEA'], farePP: 480, time: '1 stop · ~14h', carriers: 'Alaska → Icelandair', note: 'The shortest way. Icelandair’s Seattle flight leaves in the afternoon.', flag: 'win' },
  { n: '23', region: 'reykjavik', from: 'HNL', to: 'KEF', via: ['JFK'], farePP: 520, time: '1 stop · ~16h', carriers: 'Hawaiian → Icelandair', note: 'Hawaiian’s nonstop to JFK meets Icelandair’s evening departure.' },
  { n: '24', region: 'reykjavik', from: 'HNL', to: 'KEF', via: ['BOS'], farePP: 510, time: '1 stop · ~15.5h', carriers: 'Hawaiian → Icelandair', note: 'Boston is the shortest Atlantic crossing from the US.' },
  { n: '25', region: 'reykjavik', from: 'HNL', to: 'LHR', via: ['SEA', 'KEF'], farePP: 560, time: '2 stops · ~19h', carriers: 'Alaska → Icelandair', note: 'The free stopover: up to seven days in Iceland at no fare penalty, then on to London.' },
  { n: '26', region: 'reykjavik', from: 'HNL', to: 'CPH', via: ['BOS', 'KEF'], farePP: 590, time: '2 stops · ~20h', carriers: 'Hawaiian → Icelandair', note: 'Into Scandinavia. Schengen entry at Keflavík.' },
  { n: '27', region: 'reykjavik', from: 'HNL', to: 'CDG', via: ['JFK', 'KEF'], farePP: 600, time: '2 stops · ~21h', carriers: 'Hawaiian → Icelandair', note: 'Paris by the northern route — often cheaper than a direct Atlantic crossing.' },
];

// ─── Ranking ─────────────────────────────────────────────────────────────────
// Nonstops first. Within each stop count, strips run shortest-first by miles actually flown.
// Sectors that have a nonstop rank first, nearest-first by direct distance to their closest
// destination; the connecting-only sectors follow, by the same distance.

const stops = (l: Leg) => l.via?.length ?? 0;
const throughDallas = (l: Leg) => l.to === DALLAS || (l.via ?? []).includes(DALLAS);

export const legs: Leg[] = [...routings]
  .sort((a, b) => stops(a) - stops(b) || legMiles(airports, a) - legMiles(airports, b))
  .map((l, i) => ({
    ...l,
    n: String(i + 1).padStart(2, '0'),
    hue: l.region === 'asia' ? ASIA_RED : throughDallas(l) ? DALLAS_BLUE : undefined,
  }));

/** Scope legend entries for the colour-coded tracks. */
export const legend = [
  { color: ASIA_RED, label: 'Asia' },
  { color: DALLAS_BLUE, label: 'Via Dallas' },
];

/** Direct great-circle miles from Honolulu to the sector's nearest destination, rounded to ten. */
export function sectorMiles(key: string): number {
  const dests = routings.filter((l) => l.region === key).map((l) => airports[l.to]);
  const nearest = Math.min(...dests.map((d) => greatCircleMiles(airports[home], d)));
  return Math.round(nearest / 10) * 10;
}

/** Whether the sector has at least one nonstop from Honolulu. */
export const sectorNonstop = (key: string) => routings.some((l) => l.region === key && stops(l) === 0);

export const sectors: (Sector & { rank: number; miles: number; nonstop: boolean })[] = sectorList
  .map((s) => ({ ...s, rank: 0, miles: sectorMiles(s.key), nonstop: sectorNonstop(s.key) }))
  .sort((a, b) => Number(b.nonstop) - Number(a.nonstop) || a.miles - b.miles)
  .map((s, i) => ({ ...s, rank: i + 1 }));
