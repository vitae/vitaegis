// Shared route data model and geometry for every radar page under /travel.

export interface Airport {
  code: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  /** IANA time zone, for the HUD clocks. */
  tz: string;
  /** Where the HUD label sits relative to the blip, so neighbours do not collide. */
  labelSide: 'left' | 'right';
  /** Label hidden on the wide view, where it would collide with a neighbour. */
  minor?: boolean;
  /** Blip colour, e.g. a hub that legs are colour-coded by. Defaults to scope green. */
  hue?: string;
}

export interface Leg {
  n: string;
  from: string;
  to: string;
  /** Connection airports, in order, for one-stop routings. The jet flies the whole chain. */
  via?: string[];
  /** Code shown on the strip when it differs from the plotted airport (e.g. NRT/HND). */
  toLabel?: string;
  farePP: number;
  time: string;
  carriers: string;
  note: string;
  flag?: 'visa' | 'win';
  /** Region key, for the sector selector on pages that offer one. */
  region?: string;
  /** Track colour when neither selected nor hovered. Defaults to scope green. */
  hue?: string;
}

/** A routing the page deliberately avoids. Drawn dashed red on the scope. */
export interface Rejected {
  from: string;
  to: string;
  via?: string[];
}

export interface Overview {
  lat: number;
  lon: number;
  dist: number;
}

export type Airports = Record<string, Airport>;

export const waypoints = (leg: Leg | Rejected) => [leg.from, ...(leg.via ?? []), leg.to];

const R_MILES = 3958.8;
export function greatCircleMiles(a: Airport, b: Airport): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.sqrt(h));
}

/** Statute miles flown along the whole chain, rounded to ten. */
export function legMiles(airports: Airports, leg: Leg): number {
  const codes = waypoints(leg);
  let miles = 0;
  for (let i = 1; i < codes.length; i++) miles += greatCircleMiles(airports[codes[i - 1]], airports[codes[i]]);
  return Math.round(miles / 10) * 10;
}
