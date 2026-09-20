// The Pacific Circuit — HNL → Japan → China → Thailand → Vietnam → Bali → Korea → HNL.
// Fares are indicative lowest one-way economy prices from fare aggregators, September 2026.
// Entry rules are for US passports, checked September 2026. Reconfirm everything before booking.
// Macrons (kahako) are omitted on purpose: Jost has no precomposed macron vowels.

export interface Airport {
  code: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  /** Where the HUD label sits relative to the blip, so neighbours do not collide. */
  labelSide: 'left' | 'right';
  /** Label hidden on the full-circuit view, where it would collide with a neighbour. */
  minor?: boolean;
}

export interface Leg {
  n: string;
  from: string;
  to: string;
  /** Code shown on the strip when it differs from the plotted airport (e.g. NRT/HND). */
  toLabel?: string;
  farePP: number;
  time: string;
  carriers: string;
  note: string;
  flag?: 'visa' | 'win';
}

export const airports: Record<string, Airport> = {
  HNL: { code: 'HNL', city: 'Honolulu', country: 'Hawaiʻi', lat: 21.3187, lon: -157.9225, labelSide: 'right' },
  NRT: { code: 'NRT', city: 'Tokyo', country: 'Japan', lat: 35.772, lon: 140.3929, labelSide: 'right' },
  PVG: { code: 'PVG', city: 'Shanghai', country: 'China', lat: 31.1443, lon: 121.8083, labelSide: 'left' },
  BKK: { code: 'BKK', city: 'Bangkok', country: 'Thailand', lat: 13.69, lon: 100.7501, labelSide: 'left' },
  HAN: { code: 'HAN', city: 'Hanoi', country: 'Vietnam', lat: 21.2187, lon: 105.8042, labelSide: 'left', minor: true },
  SGN: { code: 'SGN', city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8188, lon: 106.6519, labelSide: 'right', minor: true },
  DPS: { code: 'DPS', city: 'Denpasar', country: 'Bali', lat: -8.7482, lon: 115.1672, labelSide: 'right' },
  ICN: { code: 'ICN', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407, labelSide: 'left' },
};

export const legs: Leg[] = [
  {
    n: '01', from: 'HNL', to: 'NRT', toLabel: 'NRT/HND', farePP: 200, time: 'Nonstop · ~8h',
    carriers: 'Hawaiian / Alaska · JAL · ANA · ZIPAIR',
    note: 'Visa-free 90 days. The long crossing — watch it furthest ahead.',
  },
  {
    n: '02', from: 'NRT', to: 'PVG', farePP: 140, time: 'Nonstop · ~3.5h',
    carriers: 'China Eastern · Spring Japan · JAL',
    note: '240-hour visa-free transit — carry the booked onward ticket to Bangkok.',
    flag: 'visa',
  },
  {
    n: '03', from: 'PVG', to: 'BKK', farePP: 100, time: 'Nonstop · ~5h',
    carriers: 'China Eastern · Thai AirAsia X · Spring',
    note: 'Visa-free 30 days. Fill in the TDAC arrival card before boarding.',
  },
  {
    n: '04', from: 'BKK', to: 'HAN', farePP: 75, time: 'Nonstop · ~2h',
    carriers: 'AirAsia · VietJet · Vietnam Airlines',
    note: 'E-visa required — apply online about two weeks out, ~$25.',
    flag: 'visa',
  },
  {
    n: '05', from: 'HAN', to: 'SGN', farePP: 45, time: 'Nonstop · ~2h',
    carriers: 'Vietnam Airlines · VietJet · Bamboo',
    note: 'Domestic hop, north to south. Same visa covers both cities.',
  },
  {
    n: '06', from: 'SGN', to: 'DPS', farePP: 100, time: '~4h nonstop · one stop often cheaper',
    carriers: 'VietJet · AirAsia · Batik Air',
    note: 'Visa on arrival, IDR 500,000 (~$32), 30 days. Buy the e-VOA ahead to skip the queue.',
    flag: 'visa',
  },
  {
    n: '07', from: 'DPS', to: 'ICN', farePP: 140, time: '~7h nonstop · one stop cheaper',
    carriers: 'Korean Air · Garuda · Asiana · LCCs via KUL/SIN',
    note: 'The well-competed half of the return split.',
    flag: 'win',
  },
  {
    n: '08', from: 'ICN', to: 'HNL', farePP: 260, time: 'Nonstop · ~8.5h',
    carriers: 'Korean Air · Asiana · Hawaiian',
    note: 'Closing the loop. You land in Honolulu before you left Seoul — same calendar day.',
  },
];

export const travelers = 2;
export const loopTotal = legs.reduce((sum, l) => sum + l.farePP, 0) * travelers;

/** The routing the loop deliberately avoids. Drawn in red on the scope. */
export const rejected = { from: 'DPS', to: 'HNL', farePP: 450, viaSeoulPP: 400 };

const R_MILES = 3958.8;
export function greatCircleMiles(a: Airport, b: Airport): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.sqrt(h));
}
export const legMiles = (l: Leg) => Math.round(greatCircleMiles(airports[l.from], airports[l.to]) / 10) * 10;
export const totalMiles = legs.reduce((sum, l) => sum + legMiles(l), 0);

// ─── Stops ───────────────────────────────────────────────────────────────────

export interface Stop {
  slug: string;
  code: string;
  city: string;
  country: string;
  tagline: string;
  nights: string;
  entry: string;
  transfer: string;
  money: string;
  dailyForTwo: string;
  doThis: string[];
  eatThis: string;
  watchOut: string;
}

export const stops: Stop[] = [
  {
    slug: 'tokyo', code: 'NRT', city: 'Tokyo', country: 'Japan',
    tagline: 'The soft landing. Everything works, everything is on time.',
    nights: '5 nights',
    entry: 'Visa-free, 90 days. Pre-fill Visit Japan Web for a QR code at immigration and customs.',
    transfer: 'Narita: Keisei Skyliner to Ueno, ~41 min, about ¥2,600. Haneda: Keikyu line or monorail, ~20–30 min, under ¥700.',
    money: 'Yen. Load a Suica or PASMO into Apple Wallet before you land — it pays for trains, konbini and vending machines.',
    dailyForTwo: '$170–240',
    doThis: [
      'Senso-ji at dawn, before the tour buses, then Kappabashi kitchen street',
      'teamLab Planets or Borderless — book the slot a few weeks out',
      'Shimokitazawa and Koenji for vintage, vinyl and tiny live houses',
      'Day trip: Nikko or Kamakura on a regular train, no tour needed',
    ],
    eatThis: 'Standing soba, depachika basement food halls near closing time when the discount stickers come out, and one proper sushi counter lunch — lunch sets run a third of dinner.',
    watchOut: 'Cherry blossom (late March – early April) and Golden Week (late April – early May) double hotel prices.',
  },
  {
    slug: 'shanghai', code: 'PVG', city: 'Shanghai', country: 'China',
    tagline: 'Ten visa-free days in the future.',
    nights: '4 nights',
    entry: '240-hour visa-free transit. Arrive from Japan, leave to Thailand — a third country, not back where you came from — with the confirmed onward ticket in hand. Ask for the transit permit at the dedicated immigration lane.',
    transfer: 'Pudong: the Maglev to Longyang Road, 8 minutes at up to 300 km/h, ¥50, then Metro Line 2. Or Line 2 all the way, ~70 min.',
    money: 'Yuan, and nearly cashless. Set up Alipay or WeChat Pay with your US card before you fly; both now accept foreign cards.',
    dailyForTwo: '$130–200',
    doThis: [
      'The Bund at blue hour, then the ferry across to Lujiazui for ¥2',
      'Former French Concession on foot — Wukang Road, Anfu Road, plane trees',
      'Yu Garden early, then Tianzifang lanes',
      'Day trip: Suzhou gardens or Zhujiajiao water town, both inside the transit zone',
    ],
    eatThis: 'Xiaolongbao and shengjianbao for breakfast, hairy crab if you land in autumn, and scallion oil noodles anywhere with a queue.',
    watchOut: 'Google, Instagram and WhatsApp are blocked. Buy a travel eSIM that roams outside the firewall before arrival. Avoid October 1–7, the Golden Week holiday.',
  },
  {
    slug: 'bangkok', code: 'BKK', city: 'Bangkok', country: 'Thailand',
    tagline: 'Heat, chaos and the best street food on the circuit.',
    nights: '5 nights',
    entry: 'Visa-free, 30 days — cut from 60 on September 15, 2026. One 30-day extension is available at immigration for about 1,900 THB. The TDAC digital arrival card is mandatory, filed within three days before arrival.',
    transfer: 'Suvarnabhumi: Airport Rail Link to Phaya Thai, 26 min, 45 THB, then BTS. Metered taxi to Sukhumvit about 350–450 THB with tolls.',
    money: 'Baht. Cash for street food and markets; ATMs charge foreign cards ~220 THB a pull, so withdraw big.',
    dailyForTwo: '$90–150',
    doThis: [
      'Wat Pho and Wat Arun by river boat — the orange-flag Chao Phraya express is ~16 THB',
      'Chatuchak weekend market, then Or Tor Kor for fruit',
      'Chinatown (Yaowarat) after dark, entirely for eating',
      'Day trip: Ayutthaya by train from Krung Thep Aphiwat, under 100 THB',
    ],
    eatThis: 'Boat noodles at Victory Monument, khao man gai, som tam with grilled chicken, mango sticky rice in season (March–June).',
    watchOut: 'Temple dress code is enforced: shoulders and knees covered. Songkran (April 13–15) is a city-wide water fight — glorious or unbearable, plan accordingly.',
  },
  {
    slug: 'hanoi', code: 'HAN', city: 'Hanoi', country: 'Vietnam',
    tagline: 'Old Quarter mornings, a thousand motorbikes, coffee with egg in it.',
    nights: '4 nights',
    entry: 'E-visa required before you fly: official portal only, ~$25 single entry, up to 90 days. Allow two weeks. Print it; list Noi Bai as entry and Tan Son Nhat as exit.',
    transfer: 'Noi Bai: bus 86 to the Old Quarter, ~50 min, 45,000 VND. Grab car ~300,000 VND.',
    money: 'Dong — you will be a millionaire at the first ATM. Cash rules outside hotels.',
    dailyForTwo: '$70–120',
    doThis: [
      'Walk the Old Quarter guild streets at 6 AM, lap Hoan Kiem Lake with the tai chi crowd',
      'Temple of Literature, then the Vietnamese Women’s Museum',
      'Train Street from a cafe, legally, with a drink in hand',
      'Two days out: Ninh Binh karsts by boat, or an overnight on Lan Ha Bay',
    ],
    eatThis: 'Bun cha for lunch, pho bo for breakfast, banh mi any time, egg coffee at a cafe that has been making it since the 1940s.',
    watchOut: 'December–February is genuinely cold and grey in the north. Pack a layer. Crossing the street: walk slowly and steadily, never stop, never run.',
  },
  {
    slug: 'saigon', code: 'SGN', city: 'Ho Chi Minh City', country: 'Vietnam',
    tagline: 'The south: hotter, faster, louder, later.',
    nights: '3 nights',
    entry: 'Same e-visa as Hanoi — the domestic flight needs only your passport.',
    transfer: 'Tan Son Nhat sits 7 km from District 1. Grab car ~150,000 VND; bus 109 for 15,000 VND.',
    money: 'Dong. Grab handles cars, bikes and food with a linked card.',
    dailyForTwo: '$70–120',
    doThis: [
      'War Remnants Museum — heavy, essential, go in the morning',
      'Cu Chi tunnels by speedboat up the Saigon River',
      'Cholon: Binh Tay market and the Thien Hau temple',
      'Rooftop beer at sunset, then Bui Vien once, for science',
    ],
    eatThis: 'Com tam broken rice, banh xeo, hu tieu, and ca phe sua da on a plastic stool.',
    watchOut: 'May–October is the wet season: a hard downpour most afternoons, then clear. Phone-snatching from motorbikes is the one real street crime — keep it off the kerb side.',
  },
  {
    slug: 'bali', code: 'DPS', city: 'Bali', country: 'Indonesia',
    tagline: 'The long exhale in the middle of the trip.',
    nights: '7 nights',
    entry: 'Visa on arrival: IDR 500,000 (~$32), 30 days, extendable once. Buy the e-VOA online ahead, file the All Indonesia arrival declaration, and pay the IDR 150,000 Bali tourist levy.',
    transfer: 'Ngurah Rai: Grab and Gojek pick up from the official lounge. Canggu or Seminyak 45–75 min, Ubud ~90 min, Uluwatu ~60 min. Traffic is the variable.',
    money: 'Rupiah. Use bank-branch ATMs, not standalone kiosks; skimmers are a known problem.',
    dailyForTwo: '$80–160',
    doThis: [
      'Split the week: Ubud for rice terraces and temples, then Uluwatu or Canggu for the coast',
      'Sunrise on Mount Batur, or skip the crowd and do Campuhan Ridge at 6 AM',
      'Uluwatu temple kecak fire dance at sunset',
      'Nusa Penida by fast boat for the cliffs — one long day',
    ],
    eatThis: 'Nasi campur from a warung, babi guling, sate lilit, and whatever the smoothie-bowl economy is doing this year.',
    watchOut: 'Nyepi, the day of silence in March, shuts the whole island including the airport for 24 hours. A scooter needs an international permit with a motorcycle endorsement, or your travel insurance will not pay.',
  },
  {
    slug: 'seoul', code: 'ICN', city: 'Seoul', country: 'South Korea',
    tagline: 'One last city, and the cheap door home.',
    nights: '4 nights',
    entry: 'Visa-free, 90 days. K-ETA is waived for US passports through December 31, 2026 — file the free e-Arrival card instead. Flying in 2027, check whether K-ETA (₩10,000) is back.',
    transfer: 'Incheon: AREX express to Seoul Station, 43 min, about ₩11,000. All-stop train to Hongdae ~55 min for half that.',
    money: 'Won. Cards everywhere; get a T-money or Climate Card for transit. Google Maps is weak here — use Naver Map or KakaoMap.',
    dailyForTwo: '$140–210',
    doThis: [
      'Gyeongbokgung in rented hanbok (free entry if you wear one), then Bukchon alleys',
      'Gwangjang Market for mung-bean pancakes and knife-cut noodles',
      'Hongdae and Seongsu at night — buskers, flow-friendly plazas, late everything',
      'A jjimjilbang bathhouse for the full scrub before the long flight',
    ],
    eatThis: 'Korean barbecue with soju, dakgalbi, convenience-store ramyeon by the Han River, and fried chicken with beer.',
    watchOut: 'Chuseok and Lunar New Year empty the city and close half of it. July–August is monsoon-humid.',
  },
];

// ─── Seasons ─────────────────────────────────────────────────────────────────
// 12 flags per row, January → December. 2 = prime, 1 = workable, 0 = avoid.

export const seasons: { label: string; months: number[]; why: string }[] = [
  { label: 'Tokyo', months: [1, 1, 2, 2, 2, 0, 0, 0, 1, 2, 2, 1], why: 'Spring bloom, autumn leaves. June rain, August steam.' },
  { label: 'Seoul', months: [0, 0, 1, 2, 2, 1, 0, 0, 2, 2, 1, 0], why: 'Spring and fall are short and perfect. Winter is hard cold.' },
  { label: 'Shanghai', months: [0, 1, 2, 2, 2, 0, 0, 0, 1, 2, 2, 1], why: 'Mild shoulders. Plum rains in June, typhoon edge in late summer.' },
  { label: 'Bangkok', months: [2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2], why: 'Cool-dry November–February. April is the furnace.' },
  { label: 'Hanoi', months: [0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 2, 1], why: 'October–November is the sweet spot. Winter drizzle, summer storms.' },
  { label: 'Saigon', months: [2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2], why: 'Dry December–April. Afternoon downpours otherwise.' },
  { label: 'Bali', months: [0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0], why: 'Dry May–September. The wet season is warm rain, not ruin.' },
];
export const monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// ─── Paperwork ───────────────────────────────────────────────────────────────

export const paperwork: { country: string; status: string; cost: string; file: string; ahead: boolean }[] = [
  { country: 'Japan', status: 'Visa-free · 90 days', cost: '$0', file: 'Visit Japan Web (optional, faster)', ahead: false },
  { country: 'China', status: '240-hour visa-free transit', cost: '$0', file: 'Onward ticket to a third country, printed', ahead: true },
  { country: 'Thailand', status: 'Visa-free · 30 days', cost: '$0', file: 'TDAC arrival card, within 3 days of landing', ahead: true },
  { country: 'Vietnam', status: 'E-visa · up to 90 days', cost: '~$25 pp', file: 'Official e-visa portal, ~2 weeks ahead', ahead: true },
  { country: 'Indonesia', status: 'Visa on arrival · 30 days', cost: '~$32 pp + ~$10 levy', file: 'e-VOA, All Indonesia declaration, Bali levy', ahead: true },
  { country: 'South Korea', status: 'Visa-free · 90 days', cost: '$0', file: 'e-Arrival card (K-ETA waived through 2026)', ahead: false },
];

// ─── Tigers ──────────────────────────────────────────────────────────────────

export const tigers = [
  {
    name: 'Tiger Park Pattaya', where: 'Bang Lamung, Chon Buri · ~1.5h drive from BKK', price: '900–1,800 THB',
    rating: '4.3 / 5 · 16,800+ reviews', desc: 'Supervised enclosure visits; price scales with the size of the animal. The only one reachable as a day trip from this route.',
  },
  {
    name: 'Tiger Kingdom Chiang Mai', where: 'Mae Rim, Chiang Mai · domestic flight from BKK', price: '750–3,000 THB',
    rating: '4.0 / 5 · 6,200+ reviews', desc: 'Newborn, smallest, small, medium and giant tiers — you pick which enclosure you enter.',
  },
  {
    name: 'Tiger Kingdom Phuket', where: 'Kathu, Phuket · domestic flight from BKK', price: '800–2,500 THB',
    rating: '3.9 / 5 · 15,500+ reviews', desc: 'Close contact and photos across age groups, including white tigers.',
  },
];

// ─── Tactics ─────────────────────────────────────────────────────────────────

export const tactics: { head: string; body: string }[] = [
  {
    head: 'Buy leg by leg, never as one ticket',
    body: 'No carrier or alliance flies this path cheaply. Round-the-world alliance fares run $3,600–4,400 per person; this loop is about $1,060. Book each leg on its own as dates firm up — six to ten weeks out catches most Asian low-cost sales. Watch the two ocean crossings further ahead.',
  },
  {
    head: 'One buffer night between every leg',
    body: 'Separate tickets mean no rebooking protection and no bag transfer if a flight runs late. A night’s cushion before each departure removes nearly all of that risk, and it is another evening somewhere good.',
  },
  {
    head: 'Price the bag before you price the seat',
    body: 'AirAsia, VietJet and Spring sell the seat and nothing else. A 20 kg checked bag bought at booking is $15–30; at the counter it is triple. Two carry-ons under 7 kg each makes every fare on this page real.',
  },
  {
    head: 'The China stop is free if the geometry is right',
    body: 'In from Japan, out to Thailand, inside 240 hours, through Pudong or Hongqiao. The rule is A → China → C. A round trip back to Tokyo would not qualify.',
  },
  {
    head: 'Aim for late October – November',
    body: 'It is the one window where almost everything lines up: autumn colour in Tokyo, Seoul and Shanghai, Hanoi at its best, Bangkok and Saigon turning dry. Bali is the compromise — shoulder season, short warm showers. March–April is the runner-up.',
  },
  {
    head: 'These are budgets, not quotes',
    body: 'Every fare here is a low-season one-way seen on aggregators in September 2026. Real prices move with dates, exchange rates and how far out you book. Re-check each leg two to three months before you fly it.',
  },
];
