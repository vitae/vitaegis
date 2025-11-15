// components/MatrixBackground.js
"use client";
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Matrix configuration based on Rezmason's implementation
const CONFIG = {
  columns: 80,
  rows: 50,
  fallSpeed: 0.05,
  cycleSpeed: 0.02,
};

// Katakana + numbers + symbols (like Rezmason)
const CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・."=*+-<>¦|_';

function MatrixRain() {
  const meshRef = useRef();
  const timeRef = useRef(0);

  // Create character texture atlas
  const charTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const size = 2048;
    const charSize = 64;
    const charsPerRow = Math.floor(size / charSize);

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#fff';
    ctx.font = `${charSize * 0.9}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    CHARS.split('').forEach((char, i) => {
      const x = (i % charsPerRow) * charSize + charSize / 2;
      const y = Math.floor(i / charsPerRow) * charSize + charSize / 2;
      ctx.fillText(char, x, y);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  // Create instances
  const { geometry, material, count } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const instancedGeo = new THREE.InstancedBufferGeometry();

    instancedGeo.index = geo.index;
    instancedGeo.attributes.position = geo.attributes.position;
    instancedGeo.attributes.uv = geo.attributes.uv;

    const instances = CONFIG.columns * CONFIG.rows;
    const offsets = new Float32Array(instances * 3);
    const charIndices = new Float32Array(instances);
    const brightnesses = new Float32Array(instances);
    const columnIds = new Float32Array(instances);
    const rowIds = new Float32Array(instances);

    let idx = 0;
    for (let row = 0; row < CONFIG.rows; row++) {
      for (let col = 0; col < CONFIG.columns; col++) {
        offsets[idx * 3] = (col - CONFIG.columns / 2);
        offsets[idx * 3 + 1] = (CONFIG.rows / 2 - row);
        offsets[idx * 3 + 2] = 0;

        charIndices[idx] = Math.floor(Math.random() * CHARS.length);
        brightnesses[idx] = 0;
        columnIds[idx] = col;
        rowIds[idx] = row;
        idx++;
      }
    }

    instancedGeo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    instancedGeo.setAttribute('aCharIndex', new THREE.InstancedBufferAttribute(charIndices, 1));
    instancedGeo.setAttribute('aBrightness', new THREE.InstancedBufferAttribute(brightnesses, 1));
    instancedGeo.setAttribute('aColumn', new THREE.InstancedBufferAttribute(columnIds, 1));
    instancedGeo.setAttribute('aRow', new THREE.InstancedBufferAttribute(rowIds, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: charTexture },
        uCharsPerRow: { value: 32 },
        uNumColumns: { value: CONFIG.columns },
        uNumRows: { value: CONFIG.rows },
      },
      vertexShader: `
        attribute vec3 offset;
        attribute float aCharIndex;
        attribute float aBrightness;
        attribute float aColumn;
        attribute float aRow;

        varying vec2 vUv;
        varying float vCharIndex;
        varying float vBrightness;

        uniform float uTime;
        uniform float uNumColumns;
        uniform float uNumRows;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          vUv = uv;
          vCharIndex = aCharIndex;

          // Sawtooth wave for each column
          float colRandom = random(vec2(aColumn, 0.0));
          float timeOffset = colRandom * 100.0;
          float speed = 0.05 + colRandom * 0.05;
          float t = uTime * speed + timeOffset;

          // Calculate brightness based on row position and time
          float rainPos = mod(t * uNumRows, uNumRows * 2.0);
          float dist = rainPos - aRow;

          // Create bright head and fading tail
          if (dist > 0.0 && dist < 20.0) {
            vBrightness = 1.0 - (dist / 20.0);
            vBrightness = pow(vBrightness, 2.0);
          } else {
            vBrightness = 0.0;
          }

          vec3 pos = position + offset;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uCharsPerRow;

        varying vec2 vUv;
        varying float vCharIndex;
        varying float vBrightness;

        void main() {
          if (vBrightness < 0.01) discard;

          // Sample character from atlas
          float col = mod(vCharIndex, uCharsPerRow);
          float row = floor(vCharIndex / uCharsPerRow);
          vec2 charUV = vec2(
            (col + vUv.x) / uCharsPerRow,
            (row + vUv.y) / uCharsPerRow
          );

          vec4 texColor = texture2D(uTexture, charUV);

          // Matrix green: HSL(108, 90%, 70%) ≈ RGB(179, 242, 77)
          vec3 green = vec3(0.7, 0.95, 0.3);
          vec3 white = vec3(1.0);

          // Bright head is white-green, tail is darker green
          vec3 color = mix(green, white, pow(vBrightness, 0.3));

          float alpha = texColor.r * vBrightness;
          gl_FragColor = vec4(color * alpha, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { geometry: instancedGeo, material: mat, count: instances };
  }, [charTexture]);

  // Animation
  useFrame((state, delta) => {
    timeRef.current += delta;
    if (material) {
      material.uniforms.uTime.value = timeRef.current;

      // Cycle characters randomly
      if (Math.random() < CONFIG.cycleSpeed) {
        const charAttr = geometry.getAttribute('aCharIndex');
        const idx = Math.floor(Math.random() * count);
        charAttr.array[idx] = Math.floor(Math.random() * CHARS.length);
        charAttr.needsUpdate = true;
      }
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  );
}

export default function MatrixBackground() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
      background: '#000',
    }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 75 }}
        gl={{ antialias: false, alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        <MatrixRain />
        <EffectComposer>
          <Bloom
            intensity={2.5}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
