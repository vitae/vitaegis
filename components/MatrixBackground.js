// components/MatrixBackground.js
"use client";
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { useEffect, useRef, useMemo } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// VITAEGIS Matrix Rain Configuration (based on Rezmason's implementation)
const config = {
  numColumns: 100,
  numRows: 60,
  fallSpeed: 0.15,
  raindropLength: 25,
  animationSpeed: 1.0,
  cycleSpeed: 0.4,
  glyphSequenceLength: 57,
  baseBrightness: 0.1,
  glintBrightness: 1.5,
  bloomStrength: 1.8,
  bloomThreshold: 0.15,
  bloomRadius: 0.6,
};

// Authentic Matrix character set
const matrixChars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・.\"=*+-<>¦|_";

// Enhanced shader implementing Rezmason's GPU state system
const MatrixShaderMaterial = {
  uniforms: {
    time: { value: 0 },
    tick: { value: 0 },
    charTexture: { value: null },
    numColumns: { value: config.numColumns },
    numRows: { value: config.numRows },
    fallSpeed: { value: config.fallSpeed },
    raindropLength: { value: config.raindropLength },
    animationSpeed: { value: config.animationSpeed },
    cycleSpeed: { value: config.cycleSpeed },
    baseBrightness: { value: config.baseBrightness },
    glintBrightness: { value: config.glintBrightness },
    glyphSequenceLength: { value: config.glyphSequenceLength },
    charsPerRow: { value: 16 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec2 vGridPos;
    varying float vColumnId;
    varying float vRowId;

    attribute vec3 offset;
    attribute float columnId;
    attribute float rowId;

    void main() {
      vUv = uv;
      vColumnId = columnId;
      vRowId = rowId;
      vGridPos = vec2(columnId, rowId);

      vec3 transformed = position + offset;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float tick;
    uniform sampler2D charTexture;
    uniform float numColumns;
    uniform float numRows;
    uniform float fallSpeed;
    uniform float raindropLength;
    uniform float animationSpeed;
    uniform float cycleSpeed;
    uniform float baseBrightness;
    uniform float glintBrightness;
    uniform float glyphSequenceLength;
    uniform float charsPerRow;

    varying vec2 vUv;
    varying vec2 vGridPos;
    varying float vColumnId;
    varying float vRowId;

    // High-quality pseudo-random (from Rezmason's implementation)
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float rand(vec3 co) {
      return rand(co.xy + co.z);
    }

    // Column timing offsets (Rezmason's staggered intro effect)
    float getColumnTimeOffset(float colId) {
      float normalizedCol = colId / numColumns;

      // Center column starts first
      if (abs(normalizedCol - 0.5) < 0.02) {
        return -1.0;
      }

      // 75% position starts second
      if (abs(normalizedCol - 0.75) < 0.02) {
        return -2.0;
      }

      // Other columns get randomized delays
      return -4.0 + rand(vec2(colId, 0.0)) * 1.5;
    }

    // Rezmason's raindrop brightness algorithm with sawtooth waves
    float getRaindropBrightness(vec2 gridPos, float simTime) {
      float columnTimeOffset = getColumnTimeOffset(gridPos.x);

      // Column-specific random speed variation
      float columnRand = rand(vec2(gridPos.x, 1.0));
      float speedMultiplier = 0.7 + columnRand * 0.6;

      // Calculate raindrop progression (sawtooth wave)
      float columnTime = (simTime + columnTimeOffset) * speedMultiplier;
      float rainTime = (gridPos.y * 0.01 + columnTime * fallSpeed) / raindropLength;

      // Create brightness wave
      float brightness = 1.0 - fract(rainTime);

      // Sharpen the head (Rezmason's glint effect)
      if (brightness > 0.92) {
        brightness = 1.0;
      } else {
        // Exponential fade for tail
        brightness = pow(brightness, 2.2);
      }

      return brightness;
    }

    // Glyph cycling with age tracking (Rezmason's symbol shader)
    float getGlyphIndex(vec2 gridPos, float simTime) {
      // Calculate glyph age (cycles over time)
      float ageIncrement = cycleSpeed * 0.016; // ~60fps
      float age = fract(simTime * ageIncrement + rand(gridPos));

      // When age wraps, pick new random glyph
      float glyphSeed = floor(simTime * ageIncrement + rand(gridPos));
      float glyphIndex = floor(glyphSequenceLength * rand(vec3(gridPos, glyphSeed)));

      return glyphIndex;
    }

    void main() {
      float simTime = time * animationSpeed;

      // Get raindrop brightness
      float rainBrightness = getRaindropBrightness(vGridPos, simTime);

      // Early discard for performance
      if (rainBrightness < 0.01) {
        discard;
      }

      // Get current glyph for this position
      float glyphIndex = getGlyphIndex(vGridPos, simTime);

      // Sample character from texture atlas
      float col = mod(glyphIndex, charsPerRow);
      float row = floor(glyphIndex / charsPerRow);
      float cellSize = 1.0 / charsPerRow;

      vec2 atlasUV = vec2(
        (col + vUv.x) * cellSize,
        (row + vUv.y) * cellSize
      );

      vec4 texColor = texture2D(charTexture, atlasUV);

      // VITAEGIS green color with brightness-based variation
      vec3 baseColor = vec3(0.0, 0.9, 0.1);
      vec3 glintColor = vec3(0.95, 1.0, 0.95);

      // Apply brightness with glint at raindrop head
      float totalBrightness = baseBrightness + rainBrightness * (1.0 - baseBrightness);
      vec3 color = mix(baseColor, glintColor, pow(rainBrightness, 0.5) * glintBrightness);

      float alpha = texColor.r * totalBrightness;
      if (alpha < 0.01) discard;

      gl_FragColor = vec4(color * alpha, alpha);
    }
  `,
};

function MatrixRain() {
  const { viewport, size } = useThree();
  const meshRef = useRef();
  const materialRef = useRef();
  const tickRef = useRef(0);

  // Calculate grid to cover full viewport
  const gridConfig = useMemo(() => {
    const cols = config.numColumns;
    const rows = config.numRows;
    const cellWidth = viewport.width / cols;
    const cellHeight = viewport.height / rows;

    return { cols, rows, cellWidth, cellHeight };
  }, [viewport]);

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
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    // Draw all characters
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

  // Create instanced geometry
  const { geometry, count } = useMemo(() => {
    const { cols, rows, cellWidth, cellHeight } = gridConfig;
    const cellGeometry = new THREE.PlaneGeometry(cellWidth, cellHeight);
    const instancedGeometry = new THREE.InstancedBufferGeometry();

    instancedGeometry.index = cellGeometry.index;
    instancedGeometry.attributes.position = cellGeometry.attributes.position;
    instancedGeometry.attributes.uv = cellGeometry.attributes.uv;

    const count = cols * rows;
    const offsets = new Float32Array(count * 3);
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

        columnIds[idx] = col;
        rowIds[idx] = row;
        idx++;
      }
    }

    instancedGeometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    instancedGeometry.setAttribute('columnId', new THREE.InstancedBufferAttribute(columnIds, 1));
    instancedGeometry.setAttribute('rowId', new THREE.InstancedBufferAttribute(rowIds, 1));

    return { geometry: instancedGeometry, count };
  }, [gridConfig]);

  // Animation loop - update uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.tick.value = tickRef.current++;
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
