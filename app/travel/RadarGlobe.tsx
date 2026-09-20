'use client';

// The 3D scope: a dot-matrix globe with great-circle flight arcs, in plain three.js — the same
// way MatrixBackgroundPro is built. (react-three-fiber v8 is in package.json but cannot run here:
// its reconciler reads React 18 internals that the React bundled with Next 16 no longer has.)
// Loaded client-side only (see RadarConsole) — WebGL has no server render.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { airports, legs, rejected, type Airport } from './data';
import { LAND } from './land';

const GREEN = '#00ff00';
const MAGENTA = '#ff00ff';
const RED = '#ff0000';
const RAD = Math.PI / 180;

/** Overview framing: mid-Pacific, so Honolulu and Bangkok both sit inside the scope. */
const OVERVIEW = { lat: 18, lon: 152, dist: 3.8 };

function toVec(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = lat * RAD;
  const lam = lon * RAD;
  return new THREE.Vector3(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)).multiplyScalar(r);
}

function slerp(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const omega = a.angleTo(b);
  const so = Math.sin(omega);
  if (so < 1e-6) return a.clone();
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - t) * omega) / so)
    .add(b.clone().multiplyScalar(Math.sin(t * omega) / so));
}

interface Arc {
  a: THREE.Vector3;
  b: THREE.Vector3;
  angle: number;
  lift: number;
  points: THREE.Vector3[];
}

function buildArc(from: Airport, to: Airport, liftScale = 1): Arc {
  const a = toVec(from.lat, from.lon);
  const b = toVec(to.lat, to.lon);
  const angle = a.angleTo(b);
  const lift = (0.035 + 0.24 * (angle / Math.PI)) * liftScale;
  const points: THREE.Vector3[] = [];
  const steps = Math.max(24, Math.round(angle * 70));
  for (let i = 0; i <= steps; i++) points.push(arcPoint(a, b, lift, i / steps));
  return { a, b, angle, lift, points };
}

function arcPoint(a: THREE.Vector3, b: THREE.Vector3, lift: number, t: number): THREE.Vector3 {
  return slerp(a, b, t).multiplyScalar(1.004 + lift * Math.sin(Math.PI * t));
}

function toLatLon(v: THREE.Vector3) {
  const n = v.clone().normalize();
  return { lat: Math.asin(n.y) / RAD, lon: Math.atan2(n.x, n.z) / RAD };
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

function fatLine(points: THREE.Vector3[], opts: { color: string; width: number; opacity: number; dashed?: boolean }): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const material = new LineMaterial({
    color: new THREE.Color(opts.color).getHex(),
    linewidth: opts.width,
    transparent: true,
    opacity: opts.opacity,
    dashed: !!opts.dashed,
    dashSize: 0.025,
    gapSize: 0.025,
    toneMapped: false,
  });
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return line;
}

interface BlipParts {
  airport: Airport;
  anchor: THREE.Group;
  dot: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  phase: number;
  on: boolean;
  label: HTMLDivElement;
  code: HTMLDivElement;
  city: HTMLDivElement;
}

function makeBlip(airport: Airport, labelLayer: HTMLElement): BlipParts {
  const position = toVec(airport.lat, airport.lon, 1.006);
  const anchor = new THREE.Group();
  anchor.position.copy(position);
  anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize());
  const isHome = airport.code === 'HNL';
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(isHome ? 0.017 : 0.012, 20),
    new THREE.MeshBasicMaterial({ color: GREEN, toneMapped: false })
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.014, 0.0175, 32),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.6, toneMapped: false, side: THREE.DoubleSide })
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

  return { airport, anchor, dot, ring, phase: (airport.lon + 180) / 47, on: false, label, code, city };
}

// ─── Component ───────────────────────────────────────────────────────────────

function shortestLon(from: number, to: number) {
  return from + ((((to - from) % 360) + 540) % 360) - 180;
}

function targetFor(selected: number | null) {
  if (selected === null) return OVERVIEW;
  const leg = legs[selected];
  const a = toVec(airports[leg.from].lat, airports[leg.from].lon);
  const b = toVec(airports[leg.to].lat, airports[leg.to].lon);
  const mid = toLatLon(slerp(a, b, 0.5));
  return { lat: mid.lat * 0.85 + 3, lon: mid.lon, dist: THREE.MathUtils.clamp(2.35 + a.angleTo(b) * 1.2, 2.6, 3.5) };
}

export interface RadarGlobeProps {
  selected: number | null;
  /** Pause rendering while the scope is scrolled out of view. */
  running: boolean;
  /** Honour prefers-reduced-motion: no tweening, no pulsing. */
  still: boolean;
}

export default function RadarGlobe({ selected, running, still }: RadarGlobeProps) {
  const mount = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  // Live values the render loop reads without re-creating the scene.
  const live = useRef({ selected, running, still, yaw: 0, pitch: 0, wake: () => {} });
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const l = live.current;
    const reselected = l.selected !== selected;
    Object.assign(l, { selected, running, still });
    if (reselected) Object.assign(l, { yaw: 0, pitch: 0 }); // a new leg re-centres the scope
    l.wake();
  }, [selected, running, still]);

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
    camera.position.set(0, 0, OVERVIEW.dist);

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
    track(fatLine(buildArc(airports[rejected.from], airports[rejected.to], 1.25).points, { color: RED, width: 1.2, opacity: 0.6, dashed: true }));

    const flights = legs.map((leg, index) => {
      const arc = buildArc(airports[leg.from], airports[leg.to]);
      const line = track(fatLine(arc.points, { color: GREEN, width: 1.3, opacity: 0.55 }));
      const plane = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 12), new THREE.MeshBasicMaterial({ color: GREEN, toneMapped: false }));
      spin.add(plane);
      return { leg, arc, line, plane, index, speed: 0.11 / Math.max(arc.angle, 0.25) };
    });

    const blips = Object.values(airports).map((airport) => {
      const blip = makeBlip(airport, labelLayer);
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

    const current = { ...OVERVIEW };
    const world = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const clock = new THREE.Clock();
    let raf = 0;
    let appliedSelection: number | null | undefined;

    const applySelection = (sel: number | null) => {
      for (const f of flights) {
        const on = f.index === sel;
        f.line.material.color.set(on ? MAGENTA : GREEN);
        f.line.material.linewidth = on ? 2.8 : 1.3;
        f.line.material.opacity = on ? 1 : 0.55;
        f.plane.material.color.set(on ? '#ffffff' : GREEN);
        f.plane.scale.setScalar(on ? 1.7 : 1);
      }
      for (const b of blips) {
        const on = sel !== null && (legs[sel].from === b.airport.code || legs[sel].to === b.airport.code);
        const home = b.airport.code === 'HNL';
        b.on = on;
        b.dot.material.color.set(on ? '#ffffff' : GREEN);
        b.ring.material.color.set(on ? MAGENTA : GREEN);
        b.code.style.color = on ? MAGENTA : home ? '#ffffff' : GREEN;
        b.code.style.fontSize = on || home ? '13px' : '11px';
        b.city.style.display = on ? 'block' : 'none';
      }
    };

    const frame = () => {
      raf = 0;
      const l = live.current;
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.elapsedTime;
      if (appliedSelection !== l.selected) applySelection((appliedSelection = l.selected));

      const target = targetFor(l.selected);
      const k = l.still ? 1 : 1 - Math.exp(-delta * 2.4);
      current.lat += (target.lat - current.lat) * k;
      current.lon += (shortestLon(current.lon, target.lon) - current.lon) * k;
      current.dist += (target.dist - current.dist) * k;
      tilt.rotation.x = (current.lat + l.pitch) * RAD;
      spin.rotation.y = -(current.lon + l.yaw) * RAD;
      camera.position.z = current.dist;
      scene.updateMatrixWorld();

      for (const f of flights) {
        const t = l.still ? 0.5 : (time * f.speed + f.index * 0.13) % 1;
        f.plane.position.copy(arcPoint(f.arc.a, f.arc.b, f.arc.lift, t));
      }
      for (const b of blips) {
        const on = b.on;
        const t = l.still ? 0.35 : (time * 0.55 + b.phase) % 1;
        b.ring.scale.setScalar(1 + t * (on ? 3.2 : 2.8));
        b.ring.material.opacity = (1 - t) * (on ? 0.9 : 0.5);

        // Pin the HTML label to the blip; hide it once the airport turns over the horizon.
        b.anchor.getWorldPosition(world);
        const facing = toCamera.copy(camera.position).sub(world).normalize().dot(world.clone().normalize());
        world.project(camera);
        const x = (world.x * 0.5 + 0.5) * size;
        const y = (-world.y * 0.5 + 0.5) * size;
        // Flip the label inward when its blip nears the edge of the scope, so it is never clipped.
        const right = b.airport.labelSide === 'right' ? x < size * 0.76 : x < size * 0.24;
        b.label.style.textAlign = right ? 'left' : 'right';
        b.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${right ? `${on ? 16 : 10}px` : `calc(-100% - ${on ? 16 : 10}px)`}, -50%)`;
        // Hanoi and Saigon crowd Bangkok from the full-circuit view; name them once zoomed in.
        const crowded = b.airport.minor && !on && current.dist > 3;
        b.label.style.opacity = facing > 0.12 && !crowded ? '1' : '0';
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
  }, []);

  // Mouse-drag to turn the globe. Touch is left alone so the page still scrolls under a thumb.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    pointer.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointer.current) return;
    const l = live.current;
    l.yaw -= (e.clientX - pointer.current.x) * 0.25;
    l.pitch = THREE.MathUtils.clamp(l.pitch + (e.clientY - pointer.current.y) * 0.25, -60, 60);
    pointer.current = { x: e.clientX, y: e.clientY };
    l.wake();
  };
  const onPointerUp = () => {
    pointer.current = null;
  };

  return (
    <div
      className="relative h-full w-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={mount} className="absolute inset-0" />
      <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}
