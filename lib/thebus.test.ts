import { describe, expect, it } from 'vitest';
import {
  clock12,
  fullTimetable,
  honoluluClock,
  nextScheduled,
  parseHeaStop,
  route14Only,
  serviceDay,
} from './thebus';

const HTML = `
<h2 style="color:black">Kalakaua Ave + Elks Club (Stop: 161)</h2>
<h3 style="color:black">
    last update: <span id="t">10:55 AM</span>
</h3>
<ul><li><a href='nextbus.asp?s=161&r=200&v=4020'><b>200<i> </i>HONOLULU ZOO - KAPIOLANI PARK</b><br><i>Westbound<br>10:07 AM &middot; <span class='waivered'>Canceled</span></i></a></li><li><a href='nextbus.asp?s=161&r=200'><b>200<i> </i>HONOLULU ZOO - KAPIOLANI PARK</b><br><i>Westbound<br>scheduled (no GPS signal) &middot; 11:07 AM</i></a></li><li><a href='nextbus.asp?s=161&r=14&v=059'><b>14<i> </i>MAUNALANI HTS VIA KAPAHULU</b><br><i>Eastbound<br>Bus 059 &#183; 11:23 AM</i></a></li><li><a href='nextbus.asp?s=161&r=14'><b>14<i> </i>MAUNALANI HTS VIA KAPAHULU</b><br><i>Eastbound<br>scheduled &middot; 12:17 PM</i></a></li></ul>`;

describe('parseHeaStop', () => {
  const stop = parseHeaStop(HTML);

  it('reads the stop header and update time', () => {
    expect(stop.stop).toBe('161');
    expect(stop.name).toBe('Kalakaua Ave + Elks Club');
    expect(stop.updated).toBe('10:55 AM');
  });

  it('classifies canceled, scheduled and live arrivals', () => {
    expect(stop.arrivals.map((a) => a.status)).toEqual([
      'canceled',
      'scheduled',
      'live',
      'scheduled',
    ]);
    expect(stop.arrivals[1].noGps).toBe(true);
    expect(stop.arrivals[2]).toMatchObject({
      route: '14',
      headsign: 'MAUNALANI HTS VIA KAPAHULU',
      direction: 'Eastbound',
      time: '11:23 AM',
      vehicle: '059',
    });
    expect(stop.arrivals[3].time).toBe('12:17 PM');
  });

  it('filters to route 14', () => {
    expect(route14Only(stop).arrivals.map((a) => a.time)).toEqual(['11:23 AM', '12:17 PM']);
  });

  it('parses the per-vehicle page variant without anchors', () => {
    const v = parseHeaStop(
      `<h2>Kalakaua Ave + Elks Club (Stop: 161)</h2><ul><li style='background-color:whitesmoke;'><b>14<i> </i>MAUNALANI HTS VIA KAPAHULU</b><br><i>Eastbound<br>Bus 059 &#183; 11:23 AM</i></li></ul>`,
    );
    expect(v.arrivals).toHaveLength(1);
    expect(v.arrivals[0].vehicle).toBe('059');
  });
});

describe('timetable helpers', () => {
  // 2026-10-01 is a Thursday. 20:00Z = 10:00 HST.
  const thu = new Date('2026-10-01T20:00:00Z');
  const sat = new Date('2026-10-03T20:00:00Z');

  it('picks the service day in Honolulu time', () => {
    expect(serviceDay(thu)).toBe('weekday');
    expect(serviceDay(sat)).toBe('saturday');
    expect(serviceDay(new Date('2026-10-04T20:00:00Z'))).toBe('sunday');
    expect(honoluluClock(thu)).toBe('10:00');
  });

  it('lists the next scheduled departures with minutes away', () => {
    const next = nextScheduled('toKahala', thu, 3);
    expect(next[0]).toEqual({ board: '10:22', alight: '10:35', minutesAway: 22 });
    expect(next).toHaveLength(3);
    expect(next[1].board > next[0].board).toBe(true);
  });

  it('exposes the full timetable for both legs', () => {
    expect(fullTimetable('toKahala', 'weekday').length).toBeGreaterThan(5);
    expect(fullTimetable('toWaikiki', 'sunday')[0][0]).toMatch(/^\d{2}:\d{2}$/);
  });

  it('formats 24h clock as 12h', () => {
    expect(clock12('08:24')).toBe('8:24 AM');
    expect(clock12('12:17')).toBe('12:17 PM');
    expect(clock12('00:05')).toBe('12:05 AM');
  });
});
