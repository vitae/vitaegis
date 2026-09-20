'use client';

// Interactive route map. Leaflet is loaded from a CDN at runtime so the site
// carries no extra bundle weight; the map only renders in the browser.

import { useEffect, useRef, useState } from 'react';
import type { RunRoute, Poi } from './routes';

// Two CDNs, tried in order, so one slow mirror does not blank the map.
const LEAFLET_SOURCES = [
  { css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js' },
  {
    css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  },
];
const LABEL_ZOOM = 14; // point-of-interest labels only show from this zoom in
// Standard OSM tiles, inverted to a dark scheme in run.css.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  const attempt = (i: number): Promise<any> =>
    new Promise((resolve, reject) => {
      const src = LEAFLET_SOURCES[i];
      if (!src) return reject(new Error('Leaflet failed to load'));
      if (!document.querySelector(`link[href="${src.css}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = src.css;
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = src.js;
      script.async = true;
      script.onload = () => resolve(w.L);
      script.onerror = () => {
        script.remove();
        attempt(i + 1).then(resolve, reject);
      };
      document.head.appendChild(script);
    });
  leafletPromise = attempt(0);
  return leafletPromise;
}


// Great-circle distance in miles, used to space the direction arrows evenly.
const R_MI = 3958.7613;
function distMi(a: [number, number], b: [number, number]) {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.sqrt(h));
}

/** Compass bearing a->b in degrees, 0 = north. CSS rotates clockwise from up, so this maps straight onto transform. */
function bearing(a: [number, number], b: [number, number]) {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Evenly spaced points along the track, each with the heading at that point. */
function arrowPoints(latlngs: [number, number][], count: number) {
  const steps: number[] = [0];
  for (let i = 1; i < latlngs.length; i++) steps.push(steps[i - 1] + distMi(latlngs[i - 1], latlngs[i]));
  const total = steps[steps.length - 1];
  if (!total) return [];
  const out: { at: [number, number]; deg: number }[] = [];
  for (let n = 1; n <= count; n++) {
    // Offset by half a step so no arrow lands on the start or finish marker.
    const target = (total * (n - 0.5)) / count;
    let i = 1;
    while (i < steps.length - 1 && steps[i] < target) i++;
    out.push({ at: latlngs[i], deg: bearing(latlngs[i - 1], latlngs[i]) });
  }
  return out;
}

interface Props {
  routes: RunRoute[];
  pois: Poi[];
  selected: string;
  onSelect: (slug: string) => void;
}

export default function RunMap({ routes, pois, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const linesRef = useRef<Record<string, any>>({});
  // Arrows and the start/finish flags belong to whichever route is selected, so they
  // live in their own layer and are rebuilt on every change.
  const markersRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: true,
        });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, className: 'run-tiles' }).addTo(map);
        // Give the map a view before any layer is added; renderers need one to draw.
        const all = L.latLngBounds(routes.flatMap((r) => r.coords.map(([lon, lat]) => [lat, lon] as [number, number])));
        map.fitBounds(all, { padding: [20, 20], animate: false });

        // Dim halo + coloured line per route, drawn back-to-front so short routes stay clickable.
        [...routes].reverse().forEach((r) => {
          const latlngs = r.coords.map(([lon, lat]) => [lat, lon]);
          const halo = L.polyline(latlngs, { color: '#000', weight: 8, opacity: 0.55, interactive: false });
          const line = L.polyline(latlngs, { color: r.color, weight: 3, opacity: 0.35 });
          line.on('click', () => onSelectRef.current(r.slug));
          line.bindTooltip(r.name, { sticky: true, className: 'run-tip' });
          halo.addTo(map);
          line.addTo(map);
          linesRef.current[r.slug] = { line, halo };
        });

        pois.forEach((p) => {
          const icon = L.divIcon({
            className: 'run-poi',
            html: `<span class="run-poi-dot" style="--c:${p.color}"></span><span class="run-poi-label">${p.label}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          L.marker([p.lat, p.lon], { icon, interactive: false }).addTo(map);
        });

        const syncLabels = () => {
          containerRef.current?.classList.toggle('run-labels-hidden', map.getZoom() < LABEL_ZOOM);
        };
        map.on('zoomend', syncLabels);
        syncLabels();

        mapRef.current = map;
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight + frame the selected route, and redraw its direction arrows and end flags.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    const L = (window as any).L;

    Object.entries(linesRef.current).forEach(([slug, { line, halo }]) => {
      const on = slug === selected;
      line.setStyle({ weight: on ? 5 : 3, opacity: on ? 1 : 0.28 });
      halo.setStyle({ opacity: on ? 0.9 : 0.3 });
      if (on) {
        map.fitBounds(line.getBounds(), { padding: [28, 28], animate: true });
        if (line._path) line.bringToFront();
      }
    });

    markersRef.current?.remove();
    const route = routes.find((r) => r.slug === selected);
    if (!route) return;

    const layer = L.layerGroup().addTo(map);
    markersRef.current = layer;

    const latlngs = route.coords.map(([lon, lat]) => [lat, lon] as [number, number]);
    const miles = route.miles;
    const count = Math.max(8, Math.min(20, Math.round(miles * 2)));

    arrowPoints(latlngs, count).forEach(({ at, deg }) => {
      const icon = L.divIcon({
        className: 'run-arrow',
        html: `<span class="run-arrow-mark" style="--c:${route.color};--deg:${deg.toFixed(1)}deg"></span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker(at, { icon, interactive: false, keyboard: false }).addTo(layer);
    });

    const start = latlngs[0];
    const finish = latlngs[latlngs.length - 1];
    // Under 100 m apart means it is a loop, so one flag says both things.
    const isLoop = distMi(start, finish) < 0.062;

    const flag = (at: [number, number], text: string, kind: string) => {
      const icon = L.divIcon({
        className: 'run-end',
        html: `<span class="run-end-mark run-end-${kind}"></span><span class="run-end-label">${text}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker(at, { icon, interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(layer);
    };

    if (isLoop) {
      flag(start, 'Start / Finish', 'loop');
    } else {
      flag(start, 'Start', 'start');
      flag(finish, 'Finish', 'finish');
    }
  }, [selected, status, routes]);

  return (
    <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-vitae-green/25 sm:h-[560px]">
      <div ref={containerRef} className="h-full w-full bg-black" />
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green/70">
          {status === 'loading' ? 'Acquiring satellites…' : 'Map unavailable — links below still work'}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vitae-green/60 to-transparent" />
    </div>
  );
}
