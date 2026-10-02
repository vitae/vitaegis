'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Matrix rain, GPU edition
   One draw call. Every glyph on screen is an instance of one quad, and its column,
   depth, position in the stream, brightness and which character it shows are all
   computed in the shader from the instance index and a clock, so per frame the CPU
   does nothing but advance a uniform. Written in three's TSL node language, which
   compiles to WGSL on WebGPU and to GLSL where only WebGL is available, so the same
   file runs on both. A bloom pass gives the glow that the glass logo carries.
   ═══════════════════════════════════════════════════════════════════════════════ */

const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
const ATLAS_COLS = 8;
const ATLAS_ROWS = Math.ceil(CHARS.length / ATLAS_COLS);
const CELL = 64;

/** Columns across, depth layers, glyphs per stream: the instance count is their product. */
const COLUMNS = 34;
const LAYERS = 3;
const TRAIL = 24;

/** Every character once, white on transparent, for the shader to pick from by index. */
function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * CELL;
  canvas.height = ATLAS_ROWS * CELL;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${CELL * 0.78}px "Jost", "Noto Sans JP", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < CHARS.length; i++) {
    const x = (i % ATLAS_COLS) * CELL + CELL / 2;
    const y = Math.floor(i / ATLAS_COLS) * CELL + CELL / 2;
    ctx.fillText(CHARS[i], x, y);
  }
  return canvas;
}

export default function MatrixRainGPU() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      // Loaded on demand: three's WebGPU build is heavy and the home page should paint
      // before it arrives.
      const [THREE, TSL, { bloom }] = await Promise.all([
        import('three/webgpu'),
        import('three/tsl'),
        import('three/addons/tsl/display/BloomNode.js'),
      ]);
      if (disposed) return;

      const {
        Fn,
        attribute,
        float,
        floor,
        fract,
        hash,
        instanceIndex,
        mix,
        pass,
        positionLocal,
        smoothstep,
        step,
        texture,
        uniform,
        uv,
        vec2,
        vec3,
        vec4,
      } = TSL;

      let renderer: InstanceType<typeof THREE.WebGPURenderer>;
      try {
        renderer = new THREE.WebGPURenderer({
          antialias: false,
          alpha: false,
          // ?gl forces the WebGL2 path, for checking that fallback by hand.
          forceWebGL: new URLSearchParams(window.location.search).has('gl'),
        });
        await renderer.init();
      } catch (err) {
        console.warn('Matrix rain disabled: no WebGPU or WebGL', err);
        return;
      }
      if (disposed) {
        renderer.dispose();
        return;
      }
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 1);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        60,
      );
      camera.position.z = 10;

      // ── geometry: one quad, instanced ────────────────────────────────────────
      const count = COLUMNS * LAYERS * TRAIL;
      const geometry = new THREE.InstancedBufferGeometry();
      const quad = new THREE.PlaneGeometry(0.5, 0.6);
      geometry.index = quad.index;
      geometry.setAttribute('position', quad.getAttribute('position'));
      geometry.setAttribute('uv', quad.getAttribute('uv'));
      geometry.instanceCount = count;
      // Column (0..COLUMNS-1), layer (0..LAYERS-1) and slot in the trail (0..TRAIL-1).
      const slotData = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        slotData[i * 3] = Math.floor(i / (LAYERS * TRAIL));
        slotData[i * 3 + 1] = Math.floor(i / TRAIL) % LAYERS;
        slotData[i * 3 + 2] = i % TRAIL;
      }
      geometry.setAttribute('glyphSlot', new THREE.InstancedBufferAttribute(slotData, 3));

      const atlas = new THREE.CanvasTexture(buildAtlas());
      atlas.colorSpace = THREE.SRGBColorSpace;

      // ── uniforms the CPU still owns: the clock and the speed multiplier ──────
      const uTime = uniform(0);
      const uSpeed = uniform(1);
      const uView = uniform(new THREE.Vector2(20, 12)); // visible width/height at z=0

      const material = new THREE.MeshBasicNodeMaterial();
      material.transparent = true;
      material.depthWrite = false;
      material.blending = THREE.AdditiveBlending;

      // Everything below runs on the GPU, once per instance per frame.
      // Not "meta": that is a reserved word in WGSL.
      const m = attribute('glyphSlot', 'vec3');
      const col = m.x;
      const layer = m.y;
      const slot = m.z;
      const seed = hash(col.mul(31).add(layer.mul(977)));
      const seed2 = hash(col.mul(53).add(layer.mul(1301)).add(7));

      const depth = layer.mul(-3.5); // layers sit further back
      const rowH = float(0.62);
      const trailLen = float(TRAIL).sub(seed2.mul(10)); // 14–24 glyphs long
      const speed = seed.mul(3).add(1.8).mul(uSpeed); // units per second
      // The cycle is three screens tall, so each stream spends most of its time off
      // screen and only about a third of the columns are lit at any moment.
      const span = uView.y.mul(3).add(trailLen.mul(rowH)).add(2);
      const head = fract(seed2.add(uTime.mul(speed).div(span))).mul(span); // 0..span
      const headY = uView.y.mul(0.5).add(1).sub(head);
      const x = col.div(COLUMNS).sub(0.5).mul(uView.x.mul(1.15)).add(layer.mul(0.37));
      const y = headY.add(slot.mul(rowH));

      // Alive only while the slot is inside this stream's trail.
      const alive = step(slot, trailLen);
      const fade = float(1).sub(slot.div(trailLen)).mul(alive);
      const isHead = float(1).sub(step(0.5, slot));

      const vPos = Fn(() => {
        const p = positionLocal.xyz.toVar();
        p.x.addAssign(x);
        p.y.addAssign(y);
        p.z.addAssign(depth);
        return p;
      })();
      material.positionNode = vPos;

      // Which glyph: changes a few times a second, more often near the head.
      const tick = floor(uTime.mul(seed.mul(6).add(4)).add(slot.mul(0.37)));
      const glyph = floor(
        hash(col.mul(7).add(slot.mul(131)).add(tick.mul(17)).add(layer)).mul(CHARS.length),
      );
      const cell = vec2(glyph.mod(ATLAS_COLS), floor(glyph.div(ATLAS_COLS)));
      const atlasUv = uv().add(cell).div(vec2(ATLAS_COLS, ATLAS_ROWS));
      const sampled = texture(atlas, atlasUv);

      const green = vec3(0.0, 1.0, 0.0);
      const pale = vec3(0.85, 1.0, 0.85);
      const dim = vec3(0.0, 0.55, 0.05);
      const body = mix(dim, green, smoothstep(0.0, 0.5, fade));
      const colorNode = mix(body, pale, isHead);
      const depthFade = float(1).sub(layer.div(LAYERS).mul(0.8));
      // Streams differ in brightness, so a few bright ones stand out of a dim field.
      const streamGain = hash(col.mul(13).add(layer.mul(401)).add(3))
        .mul(0.6)
        .add(0.4);
      const alpha = sampled.a
        .mul(fade)
        .mul(depthFade)
        .mul(streamGain)
        .mul(mix(0.3, 0.95, isHead));
      material.colorNode = vec4(colorNode.mul(alpha), alpha);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);

      // ── post: a soft bloom, the glow that bleeds onto black ──────────────────
      const post = new THREE.RenderPipeline(renderer);
      const scenePass = pass(scene, camera);
      const glow = bloom(scenePass, 0.35, 0.45, 0.6);
      post.outputNode = scenePass.add(glow);

      const fit = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        uView.value.set(vh * camera.aspect, vh);
      };
      fit();
      window.addEventListener('resize', fit);

      // Press to slow the rain, like the old background did.
      let restore = 0;
      const slow = () => {
        uSpeed.value = 0.25;
        window.clearTimeout(restore);
        restore = window.setTimeout(() => (uSpeed.value = 1), 1200);
      };
      const fast = () => {
        uSpeed.value = 1;
        window.clearTimeout(restore);
      };
      window.addEventListener('pointerdown', slow, { passive: true });
      window.addEventListener('pointerup', fast, { passive: true });

      // Pause off-screen tabs so phones do not burn battery on a hidden page.
      let running = true;
      const onVisibility = () => {
        running = document.visibilityState === 'visible';
      };
      document.addEventListener('visibilitychange', onVisibility);

      const timer = new THREE.Timer();
      renderer.setAnimationLoop(() => {
        if (!running) return;
        timer.update();
        const t = timer.getElapsed();
        uTime.value = t;
        camera.position.x = Math.sin(t * 0.3) * 0.5;
        camera.position.y = Math.cos(t * 0.4) * 0.3;
        post.render();
      });

      cleanup = () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener('resize', fit);
        window.removeEventListener('pointerdown', slow);
        window.removeEventListener('pointerup', fast);
        document.removeEventListener('visibilitychange', onVisibility);
        geometry.dispose();
        quad.dispose();
        atlas.dispose();
        material.dispose();
        post.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <>
      <div ref={ref} className="fixed inset-0 z-0 bg-black" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)',
        }}
        aria-hidden
      />
    </>
  );
}
