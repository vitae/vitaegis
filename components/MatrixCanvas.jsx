'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================================
// NEXT-GEN MATRIX RAIN - VOLUMETRIC 3D COLUMN SYSTEM
// ============================================================================
// Revolutionary approach:
// - True 3D columns with depth fog
// - Per-column wave animation with phase variation
// - Volumetric lighting and glow
// - Dynamic brightness cascades
// - Reactive to viewport with perspective depth
// ============================================================================

const vertexShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uCameraPosition;

  attribute float aColumn;
  attribute float aRow;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aDepth;
  attribute float aGlyphId;

  varying float vBrightness;
  varying float vGlyphId;
  varying float vDepthFade;
  varying vec2 vScreenPos;

  // Smooth wave function for column brightness
  float columnWave(float phase, float speed, float row, float totalRows) {
    float t = uTime * speed;
    float wavePos = fract(phase + t);
    float rowNorm = row / totalRows;

    // Distance from wave head
    float dist = abs(rowNorm - wavePos);

    // Sharp exponential falloff from head
    float brightness = exp(-dist * 20.0) * 2.5;

    // Add dimmer trailing characters
    float trail = smoothstep(0.4, 0.0, dist) * 0.25;

    return clamp(brightness + trail, 0.0, 1.0);
  }

  void main() {
    vGlyphId = aGlyphId;

    // Calculate 3D position with depth
    float cols = 80.0;
    float rows = 60.0;

    float x = (aColumn - cols * 0.5) * 0.8;
    float y = (aRow - rows * 0.5) * 1.0;
    float z = -aDepth * 25.0; // Deep 3D space

    vec4 worldPos = modelViewMatrix * vec4(x, y, z, 1.0);
    gl_Position = projectionMatrix * worldPos;

    // Calculate brightness from wave
    vBrightness = columnWave(aPhase, aSpeed, aRow, rows);

    // Depth fog effect
    float depthDist = length(worldPos.xyz);
    vDepthFade = 1.0 - smoothstep(15.0, 40.0, depthDist);

    // Screen position for effects
    vScreenPos = gl_Position.xy / gl_Position.w;

    // Dynamic point size based on depth
    float sizeFactor = 20.0 / max(1.0, depthDist * 0.15);
    gl_PointSize = sizeFactor * (0.8 + vBrightness * 0.4);
  }
`;

const fragmentShader = `
  uniform sampler2D uGlyphAtlas;
  uniform float uTime;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;

  varying float vBrightness;
  varying float vGlyphId;
  varying float vDepthFade;
  varying vec2 vScreenPos;

  // Chromatic aberration for glow
  vec3 chromaticGlow(vec2 uv, float intensity) {
    float offset = intensity * 0.02;
    float r = texture2D(uGlyphAtlas, uv + vec2(offset, 0.0)).a;
    float g = texture2D(uGlyphAtlas, uv).a;
    float b = texture2D(uGlyphAtlas, uv - vec2(offset, 0.0)).a;
    return vec3(r, g, b);
  }

  void main() {
    // Circular point shape
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Animated glyph cycling
    float glyphAnim = mod(vGlyphId + floor(uTime * 1.5), 64.0);
    vec2 atlasUV = vec2(
      mod(glyphAnim, 8.0) / 8.0 + gl_PointCoord.x / 8.0,
      floor(glyphAnim / 8.0) / 8.0 + gl_PointCoord.y / 8.0
    );

    // Get glyph with chromatic aberration on bright heads
    vec3 chromatic = chromaticGlow(atlasUV, vBrightness);
    float glyphAlpha = chromatic.g;

    // Color gradient based on brightness
    vec3 color = mix(uColorSecondary, uColorPrimary, vBrightness);

    // Add chromatic edge on bright characters
    if (vBrightness > 0.6) {
      color = mix(color, vec3(chromatic.r, chromatic.g, chromatic.b) * uColorPrimary, 0.3);
    }

    // Volumetric glow
    float glow = exp(-dist * 3.0) * vBrightness;
    color += uColorPrimary * glow * 0.4;

    // Soft edge with brightness
    float edge = 1.0 - smoothstep(0.3, 0.5, dist);

    // Final alpha with depth fade
    float alpha = glyphAlpha * edge * vBrightness * vDepthFade * 0.9;

    gl_FragColor = vec4(color, alpha);
  }
`;

function MatrixRain3D() {
  const pointsRef = useRef();
  const { viewport, camera } = useThree();

  // Generate 3D column grid
  const geometry = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const cols = isMobile ? 40 : 80;
    const rows = isMobile ? 40 : 60;
    const depthLayers = isMobile ? 3 : 5;

    const count = cols * rows * depthLayers;

    const positions = new Float32Array(count * 3);
    const columns = new Float32Array(count);
    const rowsAttr = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const depths = new Float32Array(count);
    const glyphIds = new Float32Array(count);

    let idx = 0;
    for (let layer = 0; layer < depthLayers; layer++) {
      for (let col = 0; col < cols; col++) {
        // Randomize phase per column for varied animation
        const columnPhase = Math.random();
        const columnSpeed = 0.08 + Math.random() * 0.12;

        for (let row = 0; row < rows; row++) {
          positions[idx * 3] = 0;
          positions[idx * 3 + 1] = 0;
          positions[idx * 3 + 2] = 0;

          columns[idx] = col;
          rowsAttr[idx] = row;
          speeds[idx] = columnSpeed;
          phases[idx] = columnPhase;
          depths[idx] = layer / depthLayers;
          glyphIds[idx] = Math.floor(Math.random() * 64);

          idx++;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColumn', new THREE.BufferAttribute(columns, 1));
    geo.setAttribute('aRow', new THREE.BufferAttribute(rowsAttr, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
    geo.setAttribute('aGlyphId', new THREE.BufferAttribute(glyphIds, 1));

    return geo;
  }, [viewport]);

  // Create high-quality glyph atlas
  const glyphAtlas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);

    // White glyphs with anti-aliasing
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Extended character set (Matrix style)
    const chars = 'ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ZREDACTED:・."=*+-<>¦|_';

    for (let i = 0; i < 64; i++) {
      const x = (i % 8) * 64 + 32;
      const y = Math.floor(i / 8) * 64 + 32;
      ctx.fillText(chars[i % chars.length], x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Advanced shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
        uGlyphAtlas: { value: glyphAtlas },
        uColorPrimary: { value: new THREE.Color('#00ff41') },
        uColorSecondary: { value: new THREE.Color('#003b00') },
        uCameraPosition: { value: camera.position },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
  }, [viewport, glyphAtlas, camera]);

  // Animation with camera drift
  useFrame((state) => {
    if (material) {
      material.uniforms.uTime.value = state.clock.elapsedTime;

      // Subtle camera rotation for depth perception
      const t = state.clock.elapsedTime * 0.05;
      camera.position.x = Math.sin(t) * 1.5;
      camera.position.y = Math.cos(t * 0.7) * 0.8;
      camera.lookAt(0, 0, -10);
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

export default function MatrixCanvas() {
  return (
    <div className="canvas-full">
      <Canvas
        camera={{
          position: [0, 0, 20],
          fov: 60,
          near: 0.1,
          far: 100,
        }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 25, 50]} />
        <MatrixRain3D />
      </Canvas>
    </div>
  );
}
