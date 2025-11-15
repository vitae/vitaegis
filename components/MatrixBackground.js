// components/MatrixBackground.js
"use client";
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useMemo, useState } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// VITAEGIS Matrix Rain Configuration (inspired by Rezmason's implementation)
const config = {
  numColumns: 100,
  fallSpeed: 0.08,
  raindropLength: 20,
  brightnessDecay: 0.95,
  baseBrightness: 0.3,
  glyphSequenceLength: 57,
  animationSpeed: 1.0,
  cycleSpeed: 0.3,
  glintBrightness: 1.0,
  bloomStrength: 1.5,
  bloomRadius: 0.5,
  bloomThreshold: 0.2,
};

// Authentic Matrix character set (katakana + alphanumerics)
const matrixChars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・.\"=*+-<>¦|_";

// Custom shader material implementing Rezmason's sawtooth wave algorithm
const MatrixShaderMaterial = {
  uniforms: {
    time: { value: 0 },
    charTexture: { value: null },
    numColumns: { value: config.numColumns },
    fallSpeed: { value: config.fallSpeed },
    raindropLength: { value: config.raindropLength },
    baseBrightness: { value: config.baseBrightness },
    glintBrightness: { value: config.glintBrightness },
    charsPerRow: { value: 16 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vBrightness;
    varying float vCharIndex;
    attribute vec3 offset;
    attribute float charIndex;
    attribute float columnId;
    attribute float rowId;

    uniform float time;
    uniform float numColumns;
    uniform float fallSpeed;
    uniform float raindropLength;

    // Pseudo-random function (from Rezmason's implementation)
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Rezmason's sawtooth wave brightness calculation
    float getRainBrightness(float y, float columnTime) {
      // Each column has independent timing based on random offset
      float rainTime = (y * 0.01 + columnTime) / raindropLength;
      float brightness = 1.0 - fract(rainTime);

      // Truncate to create discrete raindrops
      brightness = brightness > 0.95 ? 1.0 : brightness;

      return brightness;
    }

    void main() {
      vUv = uv;
      vCharIndex = charIndex;

      // Calculate column-specific random offset and speed multiplier
      float columnRand = rand(vec2(columnId, 0.0));
      float columnTime = time * fallSpeed * (0.8 + columnRand * 0.4);

      // Use Rezmason's sawtooth wave algorithm
      vBrightness = getRainBrightness(rowId, columnTime);

      vec3 transformed = position + offset;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D charTexture;
    uniform float charsPerRow;
    uniform float baseBrightness;
    uniform float glintBrightness;

    varying vec2 vUv;
    varying float vBrightness;
    varying float vCharIndex;

    void main() {
      // Calculate UV coordinates for character in texture atlas
      float col = mod(vCharIndex, charsPerRow);
      float row = floor(vCharIndex / charsPerRow);
      float cellSize = 1.0 / charsPerRow;

      vec2 atlasUV = vec2(
        (col + vUv.x) * cellSize,
        (row + vUv.y) * cellSize
      );

      vec4 texColor = texture2D(charTexture, atlasUV);

      // VITAEGIS green color palette with brightness variation
      vec3 baseColor = vec3(0.0, 1.0, 0.0);
      vec3 glintColor = vec3(0.9, 1.0, 0.9);

      // Apply brightness with glint effect at raindrop heads
      float brightness = baseBrightness + vBrightness * (1.0 - baseBrightness);
      vec3 color = mix(baseColor, glintColor, vBrightness * glintBrightness);

      float alpha = texColor.r * brightness;
      if (alpha < 0.01) discard;

      gl_FragColor = vec4(color * alpha, alpha);
    }
  `,
};

function MatrixRain() {
  const { viewport, size } = useThree();
  const meshRef = useRef();
  const materialRef = useRef();

  // Calculate grid dimensions based on viewport
  const gridConfig = useMemo(() => {
    const cols = config.numColumns;
    const aspectRatio = size.width / size.height;
    const rows = Math.ceil(cols / aspectRatio);
    const cellWidth = viewport.width / cols;
    const cellHeight = cellWidth; // Keep square cells

    return { cols, rows, cellWidth, cellHeight };
  }, [viewport, size]);

  // Create character texture atlas
  const charTexture = useMemo(() => {
    const fontSize = 32;
    const charsPerRow = 16;
    const atlasSize = charsPerRow * fontSize;
    const canvas = document.createElement('canvas');
    canvas.width = atlasSize;
    canvas.height = atlasSize;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, atlasSize, atlasSize);
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    // Draw all characters to atlas
    matrixChars.split('').forEach((char, index) => {
      const col = index % charsPerRow;
      const row = Math.floor(index / charsPerRow);
      const x = col * fontSize + fontSize / 2;
      const y = row * fontSize + fontSize / 2;
      ctx.fillText(char, x, y);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }, []);

  // Create instanced geometry with attributes
  const { geometry, count } = useMemo(() => {
    const { cols, rows, cellWidth, cellHeight } = gridConfig;
    const cellGeometry = new THREE.PlaneGeometry(cellWidth, cellHeight);
    const instancedGeometry = new THREE.InstancedBufferGeometry();

    instancedGeometry.index = cellGeometry.index;
    instancedGeometry.attributes.position = cellGeometry.attributes.position;
    instancedGeometry.attributes.uv = cellGeometry.attributes.uv;

    const count = cols * rows;
    const offsets = new Float32Array(count * 3);
    const charIndices = new Float32Array(count);
    const columnIds = new Float32Array(count);
    const rowIds = new Float32Array(count);

    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col - cols / 2) * cellWidth + cellWidth / 2;
        const y = (rows / 2 - row) * cellHeight - cellHeight / 2;

        offsets[idx * 3] = x;
        offsets[idx * 3 + 1] = y;
        offsets[idx * 3 + 2] = 0;

        charIndices[idx] = Math.floor(Math.random() * matrixChars.length);
        columnIds[idx] = col;
        rowIds[idx] = row;
        idx++;
      }
    }

    instancedGeometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    instancedGeometry.setAttribute('charIndex', new THREE.InstancedBufferAttribute(charIndices, 1));
    instancedGeometry.setAttribute('columnId', new THREE.InstancedBufferAttribute(columnIds, 1));
    instancedGeometry.setAttribute('rowId', new THREE.InstancedBufferAttribute(rowIds, 1));

    return { geometry: instancedGeometry, count };
  }, [gridConfig]);

  // Animate: update time uniform and cycle characters
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime * config.animationSpeed;

      // Cycle characters at random intervals (Rezmason's symbol cycling)
      if (state.clock.elapsedTime % (1 / config.cycleSpeed) < 0.016) {
        const charIndexAttr = geometry.getAttribute('charIndex');
        for (let i = 0; i < count; i++) {
          if (Math.random() < 0.05) {
            charIndexAttr.array[i] = Math.floor(Math.random() * matrixChars.length);
          }
        }
        charIndexAttr.needsUpdate = true;
      }
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        args={[MatrixShaderMaterial]}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        uniforms-charTexture-value={charTexture}
      />
    </mesh>
  );
}

export default function MatrixBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        <MatrixRain />
        <EffectComposer>
          <Bloom
            intensity={config.bloomStrength}
            luminanceThreshold={config.bloomThreshold}
            luminanceSmoothing={0.9}
            radius={config.bloomRadius}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
