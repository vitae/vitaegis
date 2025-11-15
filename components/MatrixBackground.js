"use client";
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・."=*+-<>¦|_';

function MatrixRain() {
  const meshRef = useRef();
  const timeRef = useRef(0);

  const cols = 100;
  const rows = 60;

  // Create character texture atlas
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 2048, 2048);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    CHARS.split('').forEach((char, i) => {
      const x = (i % 32) * 64 + 32;
      const y = Math.floor(i / 32) * 64 + 32;
      ctx.fillText(char, x, y);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, []);

  // Create geometry and material
  const [geometry, material] = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.4, 0.6);
    const instGeo = new THREE.InstancedBufferGeometry();

    instGeo.index = geo.index;
    instGeo.attributes.position = geo.attributes.position;
    instGeo.attributes.uv = geo.attributes.uv;

    const count = cols * rows;
    const offsets = new Float32Array(count * 3);
    const chars = new Float32Array(count);
    const columns = new Float32Array(count);
    const rowIds = new Float32Array(count);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        offsets[i * 3] = (c - cols / 2) * 0.4;
        offsets[i * 3 + 1] = (rows / 2 - r) * 0.6;
        offsets[i * 3 + 2] = 0;
        chars[i] = Math.floor(Math.random() * CHARS.length);
        columns[i] = c;
        rowIds[i] = r;
      }
    }

    instGeo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    instGeo.setAttribute('charIdx', new THREE.InstancedBufferAttribute(chars, 1));
    instGeo.setAttribute('colId', new THREE.InstancedBufferAttribute(columns, 1));
    instGeo.setAttribute('rowId', new THREE.InstancedBufferAttribute(rowIds, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTex: { value: texture },
        uCols: { value: cols },
        uRows: { value: rows },
      },
      vertexShader: `
        attribute vec3 offset;
        attribute float charIdx;
        attribute float colId;
        attribute float rowId;

        varying vec2 vUv;
        varying float vChar;
        varying float vBright;

        uniform float uTime;
        uniform float uCols;
        uniform float uRows;

        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vUv = uv;
          vChar = charIdx;

          // Each column gets random offset and speed
          float colRand = rand(vec2(colId, 0.0));
          float timeOffset = colRand * 100.0;
          float speed = 0.08 + colRand * 0.06;

          // Calculate rain position (sawtooth wave)
          float t = uTime * speed + timeOffset;
          float rainPos = mod(t * uRows, uRows * 2.0);

          // Distance from rain head
          float dist = rainPos - rowId;

          // Create bright head and fading tail
          if (dist > 0.0 && dist < 25.0) {
            vBright = 1.0 - (dist / 25.0);
            vBright = pow(vBright, 1.8);
          } else {
            vBright = 0.0;
          }

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position + offset, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;

        varying vec2 vUv;
        varying float vChar;
        varying float vBright;

        void main() {
          if (vBright < 0.01) discard;

          // Sample character from atlas
          float col = mod(vChar, 32.0);
          float row = floor(vChar / 32.0);
          vec2 uv = vec2(
            (col + vUv.x) / 32.0,
            (row + vUv.y) / 32.0
          );

          float texAlpha = texture2D(uTex, uv).r;

          // Matrix green color
          vec3 green = vec3(0.0, 1.0, 0.2);
          vec3 white = vec3(1.0, 1.0, 1.0);

          // Mix white at head, green in tail
          vec3 color = mix(green, white, pow(vBright, 0.4));

          float alpha = texAlpha * vBright;
          gl_FragColor = vec4(color * alpha, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [instGeo, mat];
  }, [texture, cols, rows]);

  // Animation loop
  useFrame((state, delta) => {
    timeRef.current += delta;
    if (material) {
      material.uniforms.uTime.value = timeRef.current;
    }

    // Randomly cycle characters
    if (Math.random() < 0.03) {
      const attr = geometry.getAttribute('charIdx');
      const idx = Math.floor(Math.random() * cols * rows);
      attr.array[idx] = Math.floor(Math.random() * CHARS.length);
      attr.needsUpdate = true;
    }
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, cols * rows]} />;
}

export default function MatrixBackground() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#000',
    }}>
      <Canvas
        camera={{ position: [0, 0, 25], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
        style={{ display: 'block' }}
      >
        <color attach="background" args={['#000000']} />
        <MatrixRain />
        <EffectComposer>
          <Bloom
            intensity={3.0}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
