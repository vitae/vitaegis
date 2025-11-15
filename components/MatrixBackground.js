// components/MatrixBackground.js
"use client";
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Katakana + symbols
const CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・."=*+-<>¦|_';

function Rain() {
  const meshRef = useRef();
  const timeRef = useRef(0);
  const cols = 80;
  const rows = 50;

  // Character texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 2048, 2048);
    ctx.fillStyle = '#fff';
    ctx.font = '60px monospace';
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

  // Geometry and material
  const [geometry, material] = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.5, 0.8);
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
        offsets[i * 3] = (c - cols / 2) * 0.5;
        offsets[i * 3 + 1] = (rows / 2 - r) * 0.8;
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

        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
          vUv = uv;
          vChar = charIdx;

          float colRand = rand(vec2(colId, 0.));
          float speed = 0.05 + colRand * 0.05;
          float t = uTime * speed + colRand * 100.0;
          float rainPos = mod(t * 50.0, 100.0);
          float dist = rainPos - rowId;

          if (dist > 0.0 && dist < 20.0) {
            vBright = 1.0 - dist / 20.0;
            vBright = pow(vBright, 2.0);
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

          float col = mod(vChar, 32.0);
          float row = floor(vChar / 32.0);
          vec2 uv = vec2((col + vUv.x) / 32.0, (row + vUv.y) / 32.0);

          float alpha = texture2D(uTex, uv).r;
          vec3 green = vec3(0.7, 0.95, 0.3);
          vec3 white = vec3(1.0);
          vec3 color = mix(green, white, pow(vBright, 0.3));

          gl_FragColor = vec4(color * alpha * vBright, alpha * vBright);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [instGeo, mat];
  }, [texture]);

  useFrame((state, delta) => {
    timeRef.current += delta;
    if (material) {
      material.uniforms.uTime.value = timeRef.current;
    }

    // Cycle chars
    if (Math.random() < 0.02) {
      const attr = geometry.getAttribute('charIdx');
      const i = Math.floor(Math.random() * cols * rows);
      attr.array[i] = Math.floor(Math.random() * CHARS.length);
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
      width: '100%',
      height: '100%',
      zIndex: -1,
    }}>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{ background: '#000' }}
      >
        <Rain />
        <EffectComposer>
          <Bloom
            intensity={2.5}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
