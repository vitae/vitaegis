// /travel — six sectors on one scope, every track out of Honolulu. A routing with a connection is one
// track that flies the whole chain (see `via`). Fares are indicative lowest one-way economy prices
// seen on aggregators, September 2026 — a planning budget, not a quote. Region keys drive the sector
// selector and the scope framing.

import { greatCircleMiles, legMiles, type Airports, type Leg, type Overview } from './_radar/geo';

export interface Sector {
  key: string;
  label: string;
  /** HUD header when this sector is lit. */
  sector: string;
  blurb: string;
  overview: Overview;
}

export const home = 'HNL';

const sectorList: Sector[] = [
  {
    key: 'asia', label: 'Asia', sector: 'Pacific sector',
    blurb: 'Tokyo and Seoul are the two nonstop doors. Everything deeper — Shanghai, Bangkok, Singapore, Bali — is one connection behind them.',
    overview: { lat: 24, lon: 170, dist: 4.4 },
  },
  {
    key: 'south-america', label: 'South America', sector: 'Andean sector',
    blurb: 'No nonstop exists. Los Angeles and Dallas are the connections; LATAM and American carry the second leg down the Andes.',
    overview: { lat: 2, lon: -105, dist: 4.4 },
  },
  {
    key: 'alaska', label: 'Alaska', sector: 'Arctic sector',
    blurb: 'A seasonal nonstop to Anchorage in summer; Seattle the rest of the year. Fairbanks and Juneau are one hop further.',
    overview: { lat: 42, lon: -145, dist: 3.9 },
  },
  {
    key: 'dallas', label: 'Dallas', sector: 'Central sector',
    blurb: 'American’s daily nonstop makes DFW the one-stop gateway to the East Coast, the Gulf, London and beyond.',
    overview: { lat: 30, lon: -122, dist: 4.2 },
  },
  {
    key: 'switzerland', label: 'Switzerland', sector: 'Alpine sector',
    blurb: 'Two flights and a half a world: a mainland gateway, then SWISS or a partner across the Atlantic to Zurich or Geneva.',
    overview: { lat: 44, lon: -78, dist: 4.4 },
  },
  {
    key: 'reykjavik', label: 'Reykjavik', sector: 'North Atlantic sector',
    blurb: 'Icelandair’s gateways — Seattle, Denver, New York, Boston — put Keflavík one stop from Honolulu, and Europe one more.',
    overview: { lat: 50, lon: -95, dist: 4.2 },
  },
];

/** Framing when no sector is picked: Honolulu at centre, both continents on the lit face. */
export const worldOverview: Overview = { lat: 30, lon: -125, dist: 4.4 };

export const airports: Airports = {
  HNL: { code: 'HNL', city: 'Honolulu', country: 'Hawaiʻi', lat: 21.3187, lon: -157.9225, tz: 'Pacific/Honolulu', labelSide: 'right' },
  // Asia
  NRT: { code: 'NRT', city: 'Tokyo', country: 'Japan', lat: 35.772, lon: 140.3929, tz: 'Asia/Tokyo', labelSide: 'right' },
  ICN: { code: 'ICN', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407, tz: 'Asia/Seoul', labelSide: 'left' },
  PVG: { code: 'PVG', city: 'Shanghai', country: 'China', lat: 31.1443, lon: 121.8083, tz: 'Asia/Shanghai', labelSide: 'left' },
  BKK: { code: 'BKK', city: 'Bangkok', country: 'Thailand', lat: 13.69, lon: 100.7501, tz: 'Asia/Bangkok', labelSide: 'left' },
  SIN: { code: 'SIN', city: 'Singapore', country: 'Singapore', lat: 1.3644, lon: 103.9915, tz: 'Asia/Singapore', labelSide: 'left', minor: true },
  DPS: { code: 'DPS', city: 'Denpasar', country: 'Bali', lat: -8.7482, lon: 115.1672, tz: 'Asia/Makassar', labelSide: 'right' },
  // Mainland gateways
  LAX: { code: 'LAX', city: 'Los Angeles', country: 'USA', lat: 33.9416, lon: -118.4085, tz: 'America/Los_Angeles', labelSide: 'left' },
  SFO: { code: 'SFO', city: 'San Francisco', country: 'USA', lat: 37.6213, lon: -122.379, tz: 'America/Los_Angeles', labelSide: 'left', minor: true },
  SEA: { code: 'SEA', city: 'Seattle', country: 'USA', lat: 47.4502, lon: -122.3088, tz: 'America/Los_Angeles', labelSide: 'left' },
  DEN: { code: 'DEN', city: 'Denver', country: 'USA', lat: 39.8561, lon: -104.6737, tz: 'America/Denver', labelSide: 'right', minor: true },
  DFW: { code: 'DFW', city: 'Dallas–Fort Worth', country: 'USA', lat: 32.8998, lon: -97.0403, tz: 'America/Chicago', labelSide: 'right' },
  ORD: { code: 'ORD', city: 'Chicago', country: 'USA', lat: 41.9742, lon: -87.9073, tz: 'America/Chicago', labelSide: 'left', minor: true },
  JFK: { code: 'JFK', city: 'New York', country: 'USA', lat: 40.6413, lon: -73.7781, tz: 'America/New_York', labelSide: 'right' },
  BOS: { code: 'BOS', city: 'Boston', country: 'USA', lat: 42.3656, lon: -71.0096, tz: 'America/New_York', labelSide: 'right', minor: true },
  MIA: { code: 'MIA', city: 'Miami', country: 'USA', lat: 25.7959, lon: -80.287, tz: 'America/New_York', labelSide: 'right' },
  // South America
  BOG: { code: 'BOG', city: 'Bogotá', country: 'Colombia', lat: 4.7016, lon: -74.1469, tz: 'America/Bogota', labelSide: 'right' },
  LIM: { code: 'LIM', city: 'Lima', country: 'Peru', lat: -12.0219, lon: -77.1143, tz: 'America/Lima', labelSide: 'left' },
  SCL: { code: 'SCL', city: 'Santiago', country: 'Chile', lat: -33.393, lon: -70.7858, tz: 'America/Santiago', labelSide: 'left' },
  EZE: { code: 'EZE', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lon: -58.5358, tz: 'America/Argentina/Buenos_Aires', labelSide: 'right' },
  GRU: { code: 'GRU', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lon: -46.4731, tz: 'America/Sao_Paulo', labelSide: 'right' },
  // Alaska
  ANC: { code: 'ANC', city: 'Anchorage', country: 'Alaska', lat: 61.1743, lon: -149.9962, tz: 'America/Anchorage', labelSide: 'left' },
  FAI: { code: 'FAI', city: 'Fairbanks', country: 'Alaska', lat: 64.8151, lon: -147.8563, tz: 'America/Anchorage', labelSide: 'right', minor: true },
  JNU: { code: 'JNU', city: 'Juneau', country: 'Alaska', lat: 58.355, lon: -134.5763, tz: 'America/Juneau', labelSide: 'right', minor: true },
  // Europe
  LHR: { code: 'LHR', city: 'London', country: 'UK', lat: 51.47, lon: -0.4543, tz: 'Europe/London', labelSide: 'left' },
  CDG: { code: 'CDG', city: 'Paris', country: 'France', lat: 49.0097, lon: 2.5479, tz: 'Europe/Paris', labelSide: 'right', minor: true },
  CPH: { code: 'CPH', city: 'Copenhagen', country: 'Denmark', lat: 55.618, lon: 12.6508, tz: 'Europe/Copenhagen', labelSide: 'right', minor: true },
  ZRH: { code: 'ZRH', city: 'Zurich', country: 'Switzerland', lat: 47.4647, lon: 8.5492, tz: 'Europe/Zurich', labelSide: 'right' },
  GVA: { code: 'GVA', city: 'Geneva', country: 'Switzerland', lat: 46.2381, lon: 6.1089, tz: 'Europe/Zurich', labelSide: 'left', minor: true },
  KEF: { code: 'KEF', city: 'Reykjavik', country: 'Iceland', lat: 63.985, lon: -22.6056, tz: 'Atlantic/Reykjavik', labelSide: 'left' },
};

const routings: Leg[] = [
  // ── Asia ──
  { n: '01', region: 'asia', from: 'HNL', to: 'NRT', toLabel: 'NRT/HND', farePP: 200, time: 'Nonstop · ~8h', carriers: 'Hawaiian / Alaska · JAL · ANA · ZIPAIR', note: 'The cheapest way off the island westbound. Visa-free 90 days in Japan.' },
  { n: '02', region: 'asia', from: 'HNL', to: 'ICN', farePP: 260, time: 'Nonstop · ~10.5h', carriers: 'Korean Air · Asiana · Hawaiian', note: 'The second door. Korean Air connects to all of Southeast Asia from here.' },
  { n: '03', region: 'asia', from: 'HNL', to: 'PVG', via: ['NRT'], farePP: 340, time: '1 stop · ~14h', carriers: 'JAL · ANA · China Eastern', note: '240-hour visa-free transit in China — carry the onward ticket.', flag: 'visa' },
  { n: '04', region: 'asia', from: 'HNL', to: 'BKK', via: ['NRT'], farePP: 330, time: '1 stop · ~17h', carriers: 'JAL · ZIPAIR · Thai AirAsia X', note: 'Or via Seoul on Korean Air. Visa-free 30 days; file the TDAC arrival card.' },
  { n: '05', region: 'asia', from: 'HNL', to: 'SIN', via: ['NRT'], farePP: 380, time: '1 stop · ~17h', carriers: 'JAL · ANA · Singapore Airlines · Scoot', note: 'Singapore Airlines and Scoot both meet the Tokyo arrival bank.' },
  { n: '06', region: 'asia', from: 'HNL', to: 'DPS', via: ['ICN'], farePP: 420, time: '1 stop · ~19h', carriers: 'Korean Air · Garuda', note: 'Visa on arrival, ~$32. Buy the e-VOA ahead of time.', flag: 'visa' },

  // ── South America ──
  { n: '07', region: 'south-america', from: 'HNL', to: 'LIM', via: ['LAX'], farePP: 520, time: '1 stop · ~15h', carriers: 'Hawaiian / Alaska · LATAM', note: 'LATAM’s LAX–Lima nonstop is the spine of the whole sector. Lima is the door to Cusco.' },
  { n: '08', region: 'south-america', from: 'HNL', to: 'BOG', via: ['DFW'], farePP: 480, time: '1 stop · ~14h', carriers: 'American · Avianca', note: 'Visa-free 90 days. Check-Mig form within 72h of arrival.' },
  { n: '09', region: 'south-america', from: 'HNL', to: 'SCL', via: ['LAX'], farePP: 560, time: '1 stop · ~17h', carriers: 'Hawaiian / Alaska · LATAM · Delta', note: 'Santiago sits under the Andes wall. Sit on the left for the descent.' },
  { n: '10', region: 'south-america', from: 'HNL', to: 'EZE', via: ['DFW'], farePP: 600, time: '1 stop · ~19h', carriers: 'American', note: 'American’s DFW–Buenos Aires nonstop. Overnight, land at dawn.' },
  { n: '11', region: 'south-america', from: 'HNL', to: 'GRU', via: ['LAX'], farePP: 580, time: '1 stop · ~18h', carriers: 'Hawaiian / Alaska · LATAM', note: 'US passports need a Brazil e-visa since April 2025, ~$81.', flag: 'visa' },

  // ── Alaska ──
  { n: '12', region: 'alaska', from: 'HNL', to: 'ANC', farePP: 260, time: 'Seasonal nonstop · ~6h', carriers: 'Alaska Airlines (summer)', note: 'Summer only. The rest of the year, see the next strip.', flag: 'win' },
  { n: '13', region: 'alaska', from: 'HNL', to: 'ANC', via: ['SEA'], farePP: 300, time: '1 stop · ~11h', carriers: 'Alaska · Delta', note: 'The year-round routing. Seattle–Anchorage runs a dozen a day.' },
  { n: '14', region: 'alaska', from: 'HNL', to: 'FAI', via: ['SEA', 'ANC'], farePP: 360, time: '2 stops · ~13h', carriers: 'Alaska', note: 'Aurora country. Best September to March.' },
  { n: '15', region: 'alaska', from: 'HNL', to: 'JNU', via: ['SEA'], farePP: 330, time: '1 stop · ~10h', carriers: 'Alaska', note: 'The capital has no road in. Fly or ferry.' },

  // ── Dallas ──
  { n: '16', region: 'dallas', from: 'HNL', to: 'DFW', farePP: 240, time: 'Nonstop · ~7.5h', carriers: 'American', note: 'Daily, year-round. The one nonstop into the middle of the map.' },
  { n: '17', region: 'dallas', from: 'HNL', to: 'JFK', via: ['DFW'], farePP: 330, time: '1 stop · ~12h', carriers: 'American', note: 'Or LaGuardia — closer to Manhattan, same fare.' },
  { n: '18', region: 'dallas', from: 'HNL', to: 'MIA', via: ['DFW'], farePP: 320, time: '1 stop · ~11.5h', carriers: 'American', note: 'The feeder for the Caribbean and every South America track.' },
  { n: '19', region: 'dallas', from: 'HNL', to: 'ORD', via: ['DFW'], farePP: 300, time: '1 stop · ~11h', carriers: 'American', note: 'United also flies Honolulu–Chicago nonstop. Compare.' },
  { n: '20', region: 'dallas', from: 'HNL', to: 'LHR', via: ['DFW'], farePP: 620, time: '1 stop · ~18h', carriers: 'American · British Airways', note: 'One stop to London. Book the 787 or A350 on the Atlantic leg.', flag: 'win' },

  // ── Switzerland ──
  { n: '21', region: 'switzerland', from: 'HNL', to: 'ZRH', via: ['LAX'], farePP: 680, time: '1 stop · ~18h', carriers: 'Hawaiian / Alaska · SWISS', note: 'SWISS’s LAX–Zurich nonstop. Evening departure, mid-afternoon arrival.' },
  { n: '22', region: 'switzerland', from: 'HNL', to: 'ZRH', via: ['SFO'], farePP: 660, time: '1 stop · ~17.5h', carriers: 'United · SWISS', note: 'The Star Alliance routing — one ticket, bags checked through.' },
  { n: '23', region: 'switzerland', from: 'HNL', to: 'ZRH', via: ['JFK'], farePP: 720, time: '1 stop · ~19h', carriers: 'Hawaiian · SWISS · Delta', note: 'Longer, but SWISS runs three a day from JFK — the most flexible connection.' },
  { n: '24', region: 'switzerland', from: 'HNL', to: 'GVA', via: ['JFK'], farePP: 740, time: '1 stop · ~19h', carriers: 'Hawaiian · SWISS', note: 'For the ski side. Ski-season Saturdays double the fare; fly midweek.' },
  { n: '25', region: 'switzerland', from: 'HNL', to: 'GVA', via: ['LHR'], farePP: 700, time: '1 stop · ~21h', carriers: 'British Airways · easyJet', note: 'BA’s Honolulu–London service via LHR, then the short hop to Geneva.' },

  // ── Reykjavik ──
  { n: '26', region: 'reykjavik', from: 'HNL', to: 'KEF', via: ['SEA'], farePP: 480, time: '1 stop · ~14h', carriers: 'Alaska · Icelandair', note: 'The shortest way. Icelandair’s Seattle flight leaves in the afternoon.', flag: 'win' },
  { n: '27', region: 'reykjavik', from: 'HNL', to: 'KEF', via: ['DEN'], farePP: 500, time: '1 stop · ~15h', carriers: 'United · Icelandair', note: 'United’s Honolulu–Denver nonstop meets Icelandair’s evening departure.' },
  { n: '28', region: 'reykjavik', from: 'HNL', to: 'KEF', via: ['JFK'], farePP: 520, time: '1 stop · ~16h', carriers: 'Hawaiian · Icelandair · PLAY', note: 'PLAY is the low-cost option from JFK. Bags and seats cost extra.' },
  { n: '29', region: 'reykjavik', from: 'HNL', to: 'LHR', via: ['SEA', 'KEF'], farePP: 560, time: '2 stops · ~19h', carriers: 'Alaska · Icelandair', note: 'The free stopover: up to seven days in Iceland at no fare penalty, then on to London.' },
  { n: '30', region: 'reykjavik', from: 'HNL', to: 'CPH', via: ['DEN', 'KEF'], farePP: 590, time: '2 stops · ~20h', carriers: 'United · Icelandair', note: 'Into Scandinavia. Schengen entry at Keflavík.' },
  { n: '31', region: 'reykjavik', from: 'HNL', to: 'CDG', via: ['JFK', 'KEF'], farePP: 600, time: '2 stops · ~21h', carriers: 'Hawaiian · Icelandair', note: 'Paris by the northern route — often cheaper than a direct Atlantic crossing.' },
];

// ─── Ranking ─────────────────────────────────────────────────────────────────
// Everything is listed by proximity to Honolulu: strips shortest-first by miles actually flown,
// sectors nearest-first by the direct great-circle distance to their closest destination.

export const legs: Leg[] = [...routings]
  .sort((a, b) => legMiles(airports, a) - legMiles(airports, b))
  .map((l, i) => ({ ...l, n: String(i + 1).padStart(2, '0') }));

/** Direct great-circle miles from Honolulu to the sector's nearest destination, rounded to ten. */
export function sectorMiles(key: string): number {
  const dests = routings.filter((l) => l.region === key).map((l) => airports[l.to]);
  const nearest = Math.min(...dests.map((d) => greatCircleMiles(airports[home], d)));
  return Math.round(nearest / 10) * 10;
}

export const sectors: (Sector & { rank: number; miles: number })[] = sectorList
  .map((s) => ({ ...s, rank: 0, miles: sectorMiles(s.key) }))
  .sort((a, b) => a.miles - b.miles)
  .map((s, i) => ({ ...s, rank: i + 1 }));
