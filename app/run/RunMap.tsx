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

  // Highlight + frame the selected route.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    Object.entries(linesRef.current).forEach(([slug, { line, halo }]) => {
      const on = slug === selected;
      line.setStyle({ weight: on ? 5 : 3, opacity: on ? 1 : 0.28 });
      halo.setStyle({ opacity: on ? 0.9 : 0.3 });
      if (on) {
        map.fitBounds(line.getBounds(), { padding: [28, 28], animate: true });
        if (line._path) line.bringToFront();
      }
    });
  }, [selected, status]);

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
