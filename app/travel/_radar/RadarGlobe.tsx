'use client';

// The 3D scope: a dot-matrix globe with great-circle flight tracks, in plain three.js — the same
// way MatrixBackgroundPro is built. (react-three-fiber v8 is in package.json but cannot run here:
// its reconciler reads React 18 internals that the React bundled with Next 16 no longer has.)
// Loaded client-side only (see RadarConsole) — WebGL has no server render.
//
// Each track is drawn the way a tactical scope draws it: a faint planned route with a flowing
// direction dash, a jet planform glyph laid onto the sphere and pointed down its ground track,
// an exhaust trail fading behind it, a velocity vector ahead of it, and an HTML target-designator
// box with a live data block (flight level, ground speed, heading, distance to go, ETA).
// One-stop routings fly the whole chain of great circles as a single track.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { legMiles, waypoints, type Airport, type Airports, type Leg, type Overview, type Rejected } from './geo';
import { LAND } from './land';

const GREEN = '#00ff00';
const MAGENTA = '#ff00ff';
const RED = '#ff0000';
const WHITE = '#ffffff';
const RAD = Math.PI / 180;

/** Exhaust trail: fraction of the route kept behind the jet, and how finely it is sampled. */
const TRAIL = 0.16;
const TRAIL_PTS = 28;
/** Velocity vector: fraction of the route projected ahead of the jet. */
const LEADER = 0.045;
/** Radii above the globe surface, so overlapping lines never z-fight. */
const R_ROUTE = 1.004;
const R_FLOW = 1.0055;
const R_TRAIL = 1.0065;
const R_JET = 1.0075;

function toVec(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = lat * RAD;
  const lam = lon * RAD;
  return new THREE.Vector3(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)).multiplyScalar(r);
}

function slerpTo(out: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const omega = a.angleTo(b);
  const so = Math.sin(omega);
  if (so < 1e-6) return out.copy(a);
  const wa = Math.sin((1 - t) * omega) / so;
  const wb = Math.sin(t * omega) / so;
  return out.set(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb);
}

interface Segment {
  a: THREE.Vector3;
  b: THREE.Vector3;
  angle: number;
  lift: number;
  /** Where this segment sits in the whole route, as fractions of total arc length. */
  start: number;
  end: number;
}

interface Route {
  segments: Segment[];
  angle: number;
  points: THREE.Vector3[];
}

/** Point on a lifted great-circle segment, written into `out` so the render loop allocates nothing. */
function arcPointTo(out: THREE.Vector3, s: Pick<Segment, 'a' | 'b' | 'lift'>, t: number, r = R_ROUTE): THREE.Vector3 {
  return slerpTo(out, s.a, s.b, t).multiplyScalar(r + s.lift * Math.sin(Math.PI * t));
}

/** Point along the whole chain, t in [0, 1] proportional to distance flown. */
function routePointTo(out: THREE.Vector3, route: Route, t: number, r = R_ROUTE): THREE.Vector3 {
  const segs = route.segments;
  let s = segs[segs.length - 1];
  for (const seg of segs) {
    if (t < seg.end) {
      s = seg;
      break;
    }
  }
  const local = THREE.MathUtils.clamp((t - s.start) / (s.end - s.start), 0, 1);
  return arcPointTo(out, s, local, r);
}

function buildRoute(airports: Airports, codes: string[], liftScale = 1, r = R_ROUTE): Route {
  const vecs = codes.map((c) => toVec(airports[c].lat, airports[c].lon));
  const angles = vecs.slice(1).map((v, i) => vecs[i].angleTo(v));
  const total = angles.reduce((sum, a) => sum + a, 0) || 1e-6;
  const segments: Segment[] = [];
  const points: THREE.Vector3[] = [];
  let start = 0;
  angles.forEach((angle, i) => {
    const end = i === angles.length - 1 ? 1 : start + angle / total;
    const seg = { a: vecs[i], b: vecs[i + 1], angle, lift: (0.035 + 0.24 * (angle / Math.PI)) * liftScale, start, end };
    segments.push(seg);
    const steps = Math.max(24, Math.round(angle * 70));
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) points.push(arcPointTo(new THREE.Vector3(), seg, k / steps, r));
    start = end;
  });
  return { segments, angle: total, points };
}

function toLatLon(v: THREE.Vector3) {
  const n = v.clone().normalize();
  return { lat: Math.asin(n.y) / RAD, lon: Math.atan2(n.x, n.z) / RAD };
}

/** Initial great-circle bearing from one point to another, degrees true. */
function bearing(from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
  const p1 = from.lat * RAD;
  const p2 = to.lat * RAD;
  const dl = (to.lon - from.lon) * RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

// ─── Scene construction ──────────────────────────────────────────────────────

function landDots(): THREE.Points {
  const positions = new Float32Array((LAND.length / 2) * 3);
  for (let i = 0; i < LAND.length; i += 2) {
    const v = toVec(LAND[i] / 10, LAND[i + 1] / 10, 1.001);
    positions.set([v.x, v.y, v.z], (i / 2) * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    g,
    new THREE.PointsMaterial({ color: GREEN, size: 0.0135, sizeAttenuation: true, transparent: true, opacity: 0.62, toneMapped: false })
  );
}

function graticule(): THREE.LineSegments {
  const verts: number[] = [];
  const push = (p: THREE.Vector3, q: THREE.Vector3) => verts.push(p.x, p.y, p.z, q.x, q.y, q.z);
  for (let lat = -60; lat <= 60; lat += 20)
    for (let lon = -180; lon < 180; lon += 4) push(toVec(lat, lon), toVec(lat, lon + 4));
  for (let lon = -180; lon < 180; lon += 20)
    for (let lat = -80; lat < 80; lat += 4) push(toVec(lat, lon), toVec(lat + 4, lon));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.07, toneMapped: false }));
}

/** Thin green rim light so the globe reads as a sphere against black. */
function atmosphere(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.13, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader:
        'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'varying vec3 vN; void main(){ float i = 0.75 * pow(clamp(-vN.z / 0.47, 0.0, 1.0), 2.6); gl_FragColor = vec4(0.0, 1.0, 0.2, 1.0) * i; }',
    })
  );
}

interface FatLineOpts {
  color: string;
  width: number;
  opacity: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
  additive?: boolean;
}

function fatLine(points: THREE.Vector3[], opts: FatLineOpts): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const material = new LineMaterial({
    color: new THREE.Color(opts.color).getHex(),
    linewidth: opts.width,
    transparent: true,
    opacity: opts.opacity,
    dashed: !!opts.dashed,
    dashSize: opts.dashSize ?? 0.025,
    gapSize: opts.gapSize ?? 0.025,
    toneMapped: false,
    depthWrite: !opts.additive,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return line;
}

/**
 * A fat line whose segments are rewritten every frame (trail, velocity vector). Per-vertex colours
 * let the trail fade to black, which under additive blending reads as fading to nothing.
 */
function liveLine(pointCount: number, width: number): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions(new Array(pointCount * 3).fill(0));
  geometry.setColors(new Array(pointCount * 3).fill(0));
  const material = new LineMaterial({
    linewidth: width,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    toneMapped: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const line = new Line2(geometry, material);
  line.frustumCulled = false; // its bounds change every frame
  return line;
}

function segmentBuffer(line: Line2, name: 'instanceStart' | 'instanceColorStart') {
  const attr = line.geometry.attributes[name] as THREE.InterleavedBufferAttribute;
  return { arr: attr.data.array as unknown as Float32Array, buf: attr.data };
}

function writePositions(line: Line2, pts: THREE.Vector3[]) {
  const { arr, buf } = segmentBuffer(line, 'instanceStart');
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const o = i * 6;
    arr[o] = p.x;
    arr[o + 1] = p.y;
    arr[o + 2] = p.z;
    arr[o + 3] = q.x;
    arr[o + 4] = q.y;
    arr[o + 5] = q.z;
  }
  buf.needsUpdate = true;
}

/** Colour ramp along the line: black at the tail, `color` at the head (power curve keeps the tail wispy). */
function writeRamp(line: Line2, color: string, tail = 0, curve = 1.6) {
  const c = new THREE.Color(color);
  const { arr, buf } = segmentBuffer(line, 'instanceColorStart');
  const n = arr.length / 6;
  for (let i = 0; i < n; i++) {
    const f0 = tail + (1 - tail) * Math.pow(i / n, curve);
    const f1 = tail + (1 - tail) * Math.pow((i + 1) / n, curve);
    const o = i * 6;
    arr[o] = c.r * f0;
    arr[o + 1] = c.g * f0;
    arr[o + 2] = c.b * f0;
    arr[o + 3] = c.r * f1;
    arr[o + 4] = c.g * f1;
    arr[o + 5] = c.b * f1;
  }
  buf.needsUpdate = true;
}

/** Fighter planform, nose along +Y, wingspan 1.24 units. Drawn once, shared by every track. */
function jetGeometry(): THREE.ShapeGeometry {
  const half: [number, number][] = [
    [0, 1], [0.07, 0.62], [0.13, 0.3], [0.62, -0.1], [0.62, -0.26], [0.21, -0.22],
    [0.24, -0.5], [0.42, -0.64], [0.42, -0.78], [0.13, -0.7], [0.09, -0.9], [0, -0.94],
  ];
  const pts = half.map(([x, y]) => new THREE.Vector2(x, y));
  for (const [x, y] of half.slice(1, -1).reverse()) pts.push(new THREE.Vector2(-x, y));
  return new THREE.ShapeGeometry(new THREE.Shape(pts));
}

interface BlipParts {
  airport: Airport;
  anchor: THREE.Group;
  dot: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  phase: number;
  on: boolean;
  /** No shown track lands here: drawn faint. */
  dim: boolean;
  label: HTMLDivElement;
  code: HTMLDivElement;
  city: HTMLDivElement;
}

function makeBlip(airport: Airport, isHome: boolean, labelLayer: HTMLElement): BlipParts {
  const position = toVec(airport.lat, airport.lon, 1.006);
  const anchor = new THREE.Group();
  anchor.position.copy(position);
  anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize());
  const hue = airport.hue ?? GREEN;
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(isHome ? 0.017 : 0.012, 20),
    new THREE.MeshBasicMaterial({ color: hue, toneMapped: false, transparent: true })
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.014, 0.0175, 32),
    new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.6, toneMapped: false, side: THREE.DoubleSide })
  );
  anchor.add(dot, ring);

  const right = airport.labelSide === 'right';
  const label = document.createElement('div');
  label.style.cssText = `position:absolute;left:0;top:0;white-space:nowrap;line-height:1.05;font-family:'Jost',sans-serif;text-shadow:0 0 6px #000,0 0 2px #000;transition:opacity 200ms;will-change:transform;text-align:${right ? 'left' : 'right'}`;
  const code = document.createElement('div');
  code.textContent = airport.code;
  code.style.cssText = 'font-weight:600;letter-spacing:0.14em';
  const city = document.createElement('div');
  city.textContent = airport.city;
  city.style.cssText = 'font-size:9px;letter-spacing:0.12em;color:rgba(255,255,255,0.75);text-transform:uppercase';
  label.append(code, city);
  labelLayer.appendChild(label);

  return { airport, anchor, dot, ring, phase: (airport.lon + 180) / 47, on: false, dim: false, label, code, city };
}

/** Target-designator box and data block, pinned to the jet from the HTML layer. */
interface Tag {
  root: HTMLDivElement;
  l1: HTMLSpanElement;
  l2: HTMLSpanElement;
  l3: HTMLSpanElement;
  at: number;
}

function makeTag(labelLayer: HTMLElement, callsign: string): Tag {
  const root = document.createElement('div');
  root.className = 'travel-tag';
  const box = document.createElement('div');
  box.className = 'travel-box';
  for (let i = 0; i < 4; i++) box.appendChild(document.createElement('i'));
  const data = document.createElement('div');
  data.className = 'travel-data';
  const b = document.createElement('b');
  b.textContent = callsign;
  const l1 = document.createElement('span');
  const l2 = document.createElement('span');
  const l3 = document.createElement('span');
  data.append(b, l1, l2, l3);
  root.append(box, data);
  labelLayer.appendChild(root);
  return { root, l1, l2, l3, at: -1 };
}

// ─── Component ───────────────────────────────────────────────────────────────

function shortestLon(from: number, to: number) {
  return from + ((((to - from) % 360) + 540) % 360) - 180;
}

const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0');

export interface RadarGlobeProps {
  airports: Airports;
  legs: Leg[];
  rejected?: Rejected;
  /** Origin airport code: bigger blip, white label. */
  home: string;
  /** Framing when no leg is selected. */
  overview: Overview;
  /** Per-leg visibility (strip filter). Omit to show every leg. */
  active?: boolean[];
  selected: number | null;
  /** Leg under the pointer — on the scope or on its strip. Drawn white. */
  hovered: number | null;
  /** Pause rendering while the scope is scrolled out of view. */
  running: boolean;
  /** Honour prefers-reduced-motion: no tweening, no pulsing. */
  still: boolean;
  /** Pointer moved over (or off) a track on the scope. */
  onHover?: (index: number | null) => void;
  /** A track was clicked on the scope. */
  onSelect?: (index: number) => void;
  /** The globe was dragged — the caller can stop its demo loop. */
  onDrag?: () => void;
}

/** Pointer must move less than this (px) between down and up to count as a click. */
const CLICK_SLOP = 4;
/** Screen-space distance (px) within which a track is under the pointer. */
const HIT_RADIUS = 12;

export default function RadarGlobe({ airports, legs, rejected, home, overview, active, selected, hovered, running, still, onHover, onSelect, onDrag }: RadarGlobeProps) {
  const mount = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  // Live values the render loop reads without re-creating the scene.
  const live = useRef({ selected, hovered, running, still, overview, active, yaw: 0, pitch: 0, wake: () => {} });
  const pointer = useRef<{ x: number; y: number; moved: number } | null>(null);
  /** Screen-space hit test, installed by the scene effect. */
  const hit = useRef<(x: number, y: number) => number | null>(() => null);
  const callbacks = useRef({ onHover, onSelect, onDrag });
  callbacks.current = { onHover, onSelect, onDrag };

  useEffect(() => {
    const l = live.current;
    const reselected = l.selected !== selected;
    Object.assign(l, { selected, hovered, running, still, overview, active });
    if (reselected) Object.assign(l, { yaw: 0, pitch: 0 }); // a new leg re-centres the scope
    l.wake();
  }, [selected, hovered, running, still, overview, active]);

  useEffect(() => {
    const host = mount.current;
    const labelLayer = labels.current;
    if (!host || !labelLayer) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(0, 0, live.current.overview.dist);

    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(atmosphere(), tilt);
    spin.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.996, 64, 64), new THREE.MeshBasicMaterial({ color: 0x000600 })),
      graticule(),
      landDots()
    );

    const lineMaterials: LineMaterial[] = [];
    const track = (line: Line2) => {
      lineMaterials.push(line.material);
      spin.add(line);
      return line;
    };
    if (rejected) {
      track(fatLine(buildRoute(airports, waypoints(rejected), 1.25).points, { color: RED, width: 1.2, opacity: 0.6, dashed: true }));
    }

    const jetGeom = jetGeometry();
    const burnerGeom = new THREE.CircleGeometry(0.11, 10);

    const flights = legs.map((leg, index) => {
      const codes = waypoints(leg);
      const route = buildRoute(airports, codes);
      // Planned route: a faint solid line under a flowing dash that shows direction of flight.
      const hue = leg.hue ?? GREEN;
      const line = track(fatLine(route.points, { color: hue, width: 1.1, opacity: 0.32 }));
      const flow = track(
        fatLine(buildRoute(airports, codes, 1, R_FLOW).points, { color: hue, width: 1.6, opacity: 0.55, dashed: true, dashSize: 0.014, gapSize: 0.034, additive: true })
      );
      const trail = track(liveLine(TRAIL_PTS + 1, 2.4));
      const leader = track(liveLine(2, 1.4));
      writeRamp(trail, hue);
      writeRamp(leader, hue, 1);

      const jet = new THREE.Mesh(jetGeom, new THREE.MeshBasicMaterial({ color: leg.hue ?? GREEN, side: THREE.DoubleSide, toneMapped: false, transparent: true }));
      jet.matrixAutoUpdate = false;
      const burner = new THREE.Mesh(
        burnerGeom,
        new THREE.MeshBasicMaterial({ color: '#c8ffd8', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
      );
      burner.position.set(0, -1.02, 0.02);
      jet.add(burner);
      spin.add(jet);

      // Flight profile. Eastbound cruises at odd flight levels, westbound at even — as the rules say.
      const east = bearing(airports[leg.from], airports[leg.to]) < 180;
      const band = route.angle > 1.2 ? 2 : route.angle > 0.5 ? 1 : 0;
      const cruiseFL = (east ? [330, 370, 390] : [340, 360, 380])[band];
      const cruiseKt = 455 + ((index * 37) % 45);
      const nm = legMiles(airports, leg) * 0.869;

      return {
        leg, route, index, line, flow, trail, leader, jet, burner,
        cruiseFL, cruiseKt, nm,
        tag: makeTag(labelLayer, `VTG${leg.n}`),
        speed: 0.11 / Math.max(route.angle, 0.25),
        size: 0.032,
        /** Outside the picked sector: drawn faint, ignored by the hit test. */
        dim: false,
      };
    });

    const blips = Object.values(airports).map((airport) => {
      const blip = makeBlip(airport, airport.code === home, labelLayer);
      spin.add(blip.anchor);
      return blip;
    });

    const composer = new EffectComposer(renderer, { multisampling: 4 });
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 1.1, luminanceThreshold: 0.12, luminanceSmoothing: 0.4, mipmapBlur: true })));

    let size = 0;
    const resize = () => {
      size = host.clientWidth;
      if (!size) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      composer.setSize(size, size);
      for (const m of lineMaterials) m.resolution.set(size, size);
    };
    const ro = new ResizeObserver(() => {
      resize();
      live.current.wake();
    });
    ro.observe(host);
    resize();

    const targetFor = (sel: number | null): Overview => {
      if (sel === null) return live.current.overview;
      const f = flights[sel];
      const mid = toLatLon(routePointTo(new THREE.Vector3(), f.route, 0.5));
      return { lat: mid.lat * 0.85 + 3, lon: mid.lon, dist: THREE.MathUtils.clamp(2.35 + f.route.angle * 1.2, 2.6, 4.4) };
    };

    const current = { ...live.current.overview };
    const world = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const ahead = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const right = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const trailPts = Array.from({ length: TRAIL_PTS + 1 }, () => new THREE.Vector3());
    const leaderPts = [new THREE.Vector3(), new THREE.Vector3()];
    const clock = new THREE.Clock();
    let raf = 0;
    let appliedSelection: number | null | undefined;
    let appliedHover: number | null | undefined;
    let appliedActive: boolean[] | undefined | null = null;

    /**
     * Looks per track, in priority order: selected (magenta, biggest), hovered (white), in the picked
     * sector (its own hue, brighter), plain (its own hue), or outside the picked sector (faint).
     */
    const applyStyles = (sel: number | null, hov: number | null, act: boolean[] | undefined) => {
      const landed = new Set<string>([home]);
      for (const f of flights) {
        const on = f.index === sel;
        const hv = !on && f.index === hov;
        const lit = on || hv;
        const inSector = act ? act[f.index] !== false : true;
        const dim = !inSector && !lit;
        const emph = inSector && !!act && !lit;
        f.dim = dim;
        if (inSector) for (const c of waypoints(f.leg)) landed.add(c);
        const hue = f.leg.hue ?? GREEN;
        const c = on ? MAGENTA : hv ? WHITE : hue;
        f.line.material.color.set(c);
        f.line.material.linewidth = on ? 2 : hv ? 1.8 : emph ? 1.5 : dim ? 0.8 : 1.1;
        f.line.material.opacity = on ? 0.7 : hv ? 0.6 : emph ? 0.5 : dim ? 0.07 : 0.32;
        f.flow.material.color.set(c);
        f.flow.material.linewidth = on ? 2.4 : hv ? 2.2 : emph ? 1.9 : dim ? 1 : 1.6;
        f.flow.material.opacity = on ? 0.9 : hv ? 0.85 : emph ? 0.75 : dim ? 0.08 : 0.55;
        f.trail.material.linewidth = on ? 3.4 : hv ? 3 : emph ? 2.7 : 2.4;
        f.trail.material.opacity = dim ? 0.12 : 1;
        f.leader.material.linewidth = lit ? 2 : 1.4;
        f.leader.material.opacity = dim ? 0.12 : 1;
        writeRamp(f.trail, lit ? WHITE : hue);
        writeRamp(f.leader, c, 1);
        f.jet.material.color.set(lit ? WHITE : hue);
        f.jet.material.opacity = dim ? 0.18 : 1;
        f.size = on ? 0.05 : hv ? 0.042 : emph ? 0.036 : 0.032;
        f.tag.root.classList.toggle('is-on', lit);
        f.tag.root.style.setProperty('--c', c);
        f.tag.root.style.display = dim ? 'none' : '';
        f.tag.at = -1;
      }
      const selCodes = sel === null ? [] : waypoints(legs[sel]);
      const hovCodes = hov === null ? [] : waypoints(legs[hov]);
      for (const b of blips) {
        const on = selCodes.includes(b.airport.code);
        const hv = !on && hovCodes.includes(b.airport.code);
        const dim = !on && !hv && !landed.has(b.airport.code);
        const isHome = b.airport.code === home;
        const hue = b.airport.hue ?? GREEN;
        b.on = on || hv;
        b.dim = dim;
        b.dot.material.color.set(on || hv ? WHITE : hue);
        b.dot.material.opacity = dim ? 0.25 : 1;
        b.ring.material.color.set(on ? MAGENTA : hv ? WHITE : hue);
        b.code.style.color = on ? MAGENTA : hv || isHome ? WHITE : hue;
        b.code.style.fontSize = on || hv || isHome ? '13px' : '11px';
        b.city.style.display = on || hv ? 'block' : 'none';
      }
    };

    // Screen-space hit test: the nearest visible, camera-facing point of any shown track.
    const hitPt = new THREE.Vector3();
    const hitNormal = new THREE.Vector3();
    hit.current = (x, y) => {
      if (!size) return null;
      let best: number | null = null;
      let bestD = HIT_RADIUS * HIT_RADIUS;
      for (const f of flights) {
        if (f.dim) continue;
        for (const p of f.route.points) {
          hitPt.copy(p).applyMatrix4(spin.matrixWorld);
          const facing = toCamera.copy(camera.position).sub(hitPt).normalize().dot(hitNormal.copy(hitPt).normalize());
          if (facing < 0.05) continue;
          hitPt.project(camera);
          const dx = (hitPt.x * 0.5 + 0.5) * size - x;
          const dy = (-hitPt.y * 0.5 + 0.5) * size - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = f.index;
          }
        }
      }
      return best;
    };

    const frame = () => {
      raf = 0;
      const l = live.current;
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.elapsedTime;
      if (appliedActive !== l.active || appliedSelection !== l.selected || appliedHover !== l.hovered) {
        applyStyles((appliedSelection = l.selected), (appliedHover = l.hovered), (appliedActive = l.active));
      }

      const target = targetFor(l.selected);
      const k = l.still ? 1 : 1 - Math.exp(-delta * 2.4);
      current.lat += (target.lat - current.lat) * k;
      current.lon += (shortestLon(current.lon, target.lon) - current.lon) * k;
      current.dist += (target.dist - current.dist) * k;
      tilt.rotation.x = (current.lat + l.pitch) * RAD;
      spin.rotation.y = -(current.lon + l.yaw) * RAD;
      camera.position.z = current.dist;

      for (const f of flights) {
        const t = l.still ? 0.5 : (time * f.speed + f.index * 0.13) % 1;

        // Jet: sit on the sphere, nose down the ground track (basis: right, forward, outward normal).
        routePointTo(pos, f.route, t, R_JET);
        routePointTo(ahead, f.route, Math.min(1, t + 0.004), R_JET);
        normal.copy(pos).normalize();
        forward.subVectors(ahead, pos).normalize();
        right.crossVectors(forward, normal).normalize();
        forward.crossVectors(normal, right);
        f.jet.matrix.makeBasis(right, forward, normal).scale(scale.setScalar(f.size)).setPosition(pos);
        f.jet.matrixWorldNeedsUpdate = true;
        f.burner.material.opacity = (f.dim ? 0.15 : 1) * (l.still ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(time * 29 + f.index * 1.7)));

        // Exhaust trail behind, velocity vector ahead. Both compress at the ends of the route.
        const t0 = Math.max(0, t - TRAIL);
        for (let i = 0; i <= TRAIL_PTS; i++) routePointTo(trailPts[i], f.route, t0 + ((t - t0) * i) / TRAIL_PTS, R_TRAIL);
        writePositions(f.trail, trailPts);
        routePointTo(leaderPts[0], f.route, t, R_JET);
        routePointTo(leaderPts[1], f.route, Math.min(1, t + LEADER), R_JET);
        writePositions(f.leader, leaderPts);

        // Route dash flows toward the destination.
        if (!l.still) f.flow.material.dashOffset -= delta * 0.045;

        // Data block, refreshed at a readable cadence rather than every frame.
        if (f.tag.at < 0 || time - f.tag.at > 0.15) {
          f.tag.at = time;
          const profile = Math.min(THREE.MathUtils.smoothstep(t, 0, 0.12), 1 - THREE.MathUtils.smoothstep(t, 0.84, 1));
          const alt = Math.round((f.cruiseFL * 100 * profile) / 100) * 100;
          const gs = Math.round(150 + (f.cruiseKt - 150) * profile);
          const hdg = bearing(toLatLon(pos), toLatLon(ahead));
          const dtg = Math.round((1 - t) * f.nm);
          const etaMin = (dtg / Math.max(gs, 1)) * 60;
          f.tag.l1.textContent = `${alt >= 18000 ? `FL${pad3(alt / 100)}` : `${alt.toLocaleString('en-US')} FT`} · ${gs} KT`;
          f.tag.l2.textContent = `HDG ${pad3(hdg)} · ${dtg.toLocaleString('en-US')} NM`;
          f.tag.l3.textContent = `${f.leg.to} ETA ${Math.floor(etaMin / 60)}H${pad3(etaMin % 60).slice(1)}`;
        }
      }

      scene.updateMatrixWorld();

      for (const f of flights) {
        if (f.dim) continue;
        f.jet.getWorldPosition(world);
        const facing = toCamera.copy(camera.position).sub(world).normalize().dot(normal.copy(world).normalize());
        world.project(camera);
        f.tag.root.style.transform = `translate(${((world.x * 0.5 + 0.5) * size).toFixed(1)}px, ${((-world.y * 0.5 + 0.5) * size).toFixed(1)}px)`;
        f.tag.root.style.opacity = facing > (f.index === l.selected || f.index === l.hovered ? 0.02 : 0.1) ? '1' : '0';
      }

      for (const b of blips) {
        const on = b.on;
        const t = l.still ? 0.35 : (time * 0.55 + b.phase) % 1;
        b.ring.scale.setScalar(1 + t * (on ? 3.2 : 2.8));
        b.ring.material.opacity = (1 - t) * (on ? 0.9 : b.dim ? 0.12 : 0.5);

        // Pin the HTML label to the blip; hide it once the airport turns over the horizon.
        b.anchor.getWorldPosition(world);
        const facing = toCamera.copy(camera.position).sub(world).normalize().dot(normal.copy(world).normalize());
        world.project(camera);
        const x = (world.x * 0.5 + 0.5) * size;
        const y = (-world.y * 0.5 + 0.5) * size;
        // Flip the label inward when its blip nears the edge of the scope, so it is never clipped.
        const right = b.airport.labelSide === 'right' ? x < size * 0.76 : x < size * 0.24;
        b.label.style.textAlign = right ? 'left' : 'right';
        b.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${right ? `${on ? 16 : 10}px` : `calc(-100% - ${on ? 16 : 10}px)`}, -50%)`;
        // Minor airports crowd their neighbours on the wide view; name them once zoomed in.
        const crowded = b.airport.minor && !on && current.dist > 3;
        b.label.style.opacity = facing > 0.12 && !crowded ? (b.dim ? '0.28' : '1') : '0';
      }

      composer.render(delta);
      if (l.running && !l.still) raf = requestAnimationFrame(frame);
    };
    live.current.wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    live.current.wake();

    return () => {
      live.current.wake = () => {};
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelLayer.replaceChildren();
    };
  }, [airports, legs, rejected, home]);

  // Mouse: drag turns the globe, a still click selects the track under the pointer, a plain move
  // hovers it. Touch is left alone so the page still scrolls under a thumb.
  const local = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    pointer.current = { x: e.clientX, y: e.clientY, moved: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const l = live.current;
    const p = pointer.current;
    const hover = (over: number | null) => {
      if (over === l.hovered) return;
      l.hovered = over; // applied now so the next frame reflects it before React re-renders
      callbacks.current.onHover?.(over);
      l.wake();
    };
    if (!p) {
      const over = hit.current(local(e).x, local(e).y);
      hover(over);
      (e.currentTarget as HTMLElement).style.cursor = over === null ? 'grab' : 'pointer';
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.moved += Math.abs(dx) + Math.abs(dy);
    if (p.moved > CLICK_SLOP) {
      hover(null);
      callbacks.current.onDrag?.();
      (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    }
    l.yaw -= dx * 0.25;
    l.pitch = THREE.MathUtils.clamp(l.pitch + dy * 0.25, -60, 60);
    p.x = e.clientX;
    p.y = e.clientY;
    l.wake();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointer.current;
    pointer.current = null;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    if (p && p.moved <= CLICK_SLOP) {
      const over = hit.current(local(e).x, local(e).y);
      if (over !== null) callbacks.current.onSelect?.(over);
    }
  };
  const onPointerLeave = () => {
    if (live.current.hovered !== null) callbacks.current.onHover?.(null);
  };

  return (
    <div
      className="relative h-full w-full cursor-grab"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <div ref={mount} className="absolute inset-0" />
      <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
