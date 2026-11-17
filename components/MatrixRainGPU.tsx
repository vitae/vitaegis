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

/** Most columns a very wide screen can show, and glyphs per stream: the instance count is
    their product. Each column carries one stream at its own depth, so streams never overlap. */
const MAX_COLUMNS = 48;
const TRAIL = 24;
/** Distance between columns, in world units at the front of the scene (a glyph is 0.5 wide). */
const PITCH = 0.9;
const CAM_Z = 10;
/** How far back the deepest stream sits. */
const DEPTH = 12;

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
      camera.position.z = CAM_Z;

      // ── geometry: one quad, instanced ────────────────────────────────────────
      const count = MAX_COLUMNS * TRAIL;
      const geometry = new THREE.InstancedBufferGeometry();
      const quad = new THREE.PlaneGeometry(0.5, 0.6);
      geometry.index = quad.index;
      geometry.setAttribute('position', quad.getAttribute('position'));
      geometry.setAttribute('uv', quad.getAttribute('uv'));
      geometry.instanceCount = count;
      // Column (0..MAX_COLUMNS-1) and slot in the trail (0..TRAIL-1).
      const slotData = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        slotData[i * 2] = Math.floor(i / TRAIL);
        slotData[i * 2 + 1] = i % TRAIL;
      }
      geometry.setAttribute('glyphSlot', new THREE.InstancedBufferAttribute(slotData, 2));

      const atlas = new THREE.CanvasTexture(buildAtlas());
      atlas.colorSpace = THREE.SRGBColorSpace;

      // ── uniforms the CPU still owns: the clock ───────────────────────────────
      const uTime = uniform(0);
      const uView = uniform(new THREE.Vector2(20, 12)); // visible width/height at z=0
      // Pointer in world units at z=0 (far off screen until it moves) and page scroll in screens.
      const uPointer = uniform(new THREE.Vector2(999, 999));
      const uScroll = uniform(0);
      // Columns that fit this screen at PITCH apart; the rest of the instances stay dark.
      const uCols = uniform(MAX_COLUMNS);

      const material = new THREE.MeshBasicNodeMaterial();
      material.transparent = true;
      material.depthWrite = false;
      material.blending = THREE.AdditiveBlending;

      // Everything below runs on the GPU, once per instance per frame.
      // Not "meta": that is a reserved word in WGSL.
      const m = attribute('glyphSlot', 'vec2');
      const col = m.x;
      const slot = m.y;
      const seed = hash(col.mul(31).add(11));
      const seed2 = hash(col.mul(53).add(7));

      // Each column sits at its own depth. k is how much wider the view is back there, so
      // placing a stream at (screen fraction × k) keeps the columns evenly spaced on screen
      // while perspective shrinks, dims and slows the far ones.
      const k = hash(col.mul(97).add(3))
        .pow(1.6)
        .mul(DEPTH / CAM_Z)
        .add(1);
      const depth = float(1).sub(k).mul(CAM_Z);
      const viewH = uView.y.mul(k);
      const rowH = float(0.62);
      const trailLen = float(TRAIL).sub(seed2.mul(10)); // 14–24 glyphs long
      const speed = seed.mul(3).add(1.8); // units per second
      // The cycle is a screen and a half tall, so a stream is off screen for part of it.
      const span = viewH.mul(1.5).add(trailLen.mul(rowH)).add(2);
      // Page scroll pushes the streams back up; the same push reads smaller on far streams,
      // which is the parallax. It wraps with the stream's own cycle on a page of any length.
      const drift = uScroll.mul(uView.y).mul(0.35);
      const head = fract(seed2.add(uTime.mul(speed).sub(drift).div(span))).mul(span); // 0..span
      const headY = viewH.mul(0.5).add(1).sub(head);
      const x = col.add(0.5).div(uCols).sub(0.5).mul(uView.x.mul(1.1)).mul(k);
      const y = headY.add(slot.mul(rowH));

      // Alive only while the slot is inside this stream's trail and the column is on screen.
      const alive = step(slot, trailLen).mul(step(col, uCols.sub(0.5)));
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
      const glyph = floor(hash(col.mul(7).add(slot.mul(131)).add(tick.mul(17))).mul(CHARS.length));
      const cell = vec2(glyph.mod(ATLAS_COLS), floor(glyph.div(ATLAS_COLS)));
      const atlasUv = uv().add(cell).div(vec2(ATLAS_COLS, ATLAS_ROWS));
      const sampled = texture(atlas, atlasUv);

      const green = vec3(0.0, 1.0, 0.0);
      const pale = vec3(0.7, 1.0, 0.7);
      const colorNode = mix(green, pale, isHead);
      const depthFade = float(1).sub(
        k
          .sub(1)
          .div(DEPTH / CAM_Z)
          .mul(0.6),
      );
      // Streams differ in brightness, so a few bright ones stand out of a dim field.
      const streamGain = hash(col.mul(13).add(5)).mul(0.45).add(0.55);
      // Glyphs within reach of the pointer light up, falling off smoothly with distance.
      const reach = float(1).sub(smoothstep(0.0, 3.2, vec2(x, y).div(k).sub(uPointer).length()));
      const alpha = sampled.a
        .mul(fade)
        .mul(depthFade)
        .mul(streamGain.add(reach.mul(0.9)))
        .mul(mix(0.5, 1.0, isHead));
      material.colorNode = vec4(colorNode.mul(alpha), alpha);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);

      // ── post: a soft bloom, the glow that bleeds onto black ──────────────────
      const post = new THREE.RenderPipeline(renderer);
      const scenePass = pass(scene, camera);
      // Bloom is the expensive pass; phones get the rain without it.
      const phone = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
      post.outputNode = phone ? scenePass : scenePass.add(bloom(scenePass, 0.35, 0.45, 0.6));

      const fit = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // A hidden or collapsed window reports zero; a zero-sized swapchain is an error.
        if (w < 2 || h < 2) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        uView.value.set(vh * camera.aspect, vh);
        uCols.value = Math.max(
          4,
          Math.min(MAX_COLUMNS, Math.floor((vh * camera.aspect * 1.1) / PITCH)),
        );
      };
      fit();
      window.addEventListener('resize', fit);

      const onPointer = (e: PointerEvent) => {
        uPointer.value.set(
          (e.clientX / window.innerWidth - 0.5) * uView.value.x,
          (0.5 - e.clientY / window.innerHeight) * uView.value.y,
        );
      };
      const onPointerGone = () => uPointer.value.set(999, 999);
      const onScroll = () => {
        uScroll.value = window.scrollY / Math.max(window.innerHeight, 1);
      };
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerGone);
      window.addEventListener('scroll', onScroll, { passive: true });

      // Pause off-screen tabs so phones do not burn battery on a hidden page.
      let running = true;
      const onVisibility = () => {
        running = document.visibilityState === 'visible';
      };
      document.addEventListener('visibilitychange', onVisibility);

      const timer = new THREE.Timer();
      renderer.setAnimationLoop(() => {
        if (!running || window.innerWidth < 2 || window.innerHeight < 2) return;
        timer.update();
        const t = timer.getElapsed();
        uTime.value = t;
        camera.position.x = Math.sin(t * 0.3) * 0.35;
        camera.position.y = Math.cos(t * 0.4) * 0.3;
        post.render();
      });

      cleanup = () => {
        renderer.setAnimationLoop(null);
        window.removeEventListener('resize', fit);
        window.removeEventListener('pointermove', onPointer);
        document.documentElement.removeEventListener('pointerleave', onPointerGone);
        window.removeEventListener('scroll', onScroll);
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
