'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Vertex Shader - handles instanced character positioning and animation
const vertexShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uParallaxStrength;

  attribute float aOffset;
  attribute float aSpeed;
  attribute float aGlyph;
  attribute float aColumn;
  attribute float aLen;

  varying vec2 vUv;
  varying float vGlyph;
  varying float vBrightness;
  varying float vAlpha;

  void main() {
    vUv = uv;
    vGlyph = aGlyph;

    // Calculate vertical position with wrapping
    float yPos = mod(position.y + aOffset + uTime * aSpeed, uResolution.y + 20.0) - 10.0;

    // Calculate brightness (bright head, fading tail)
    float headPosition = mod(aOffset + uTime * aSpeed, uResolution.y + 20.0);
    float distanceFromHead = abs(yPos - headPosition);
    vBrightness = 1.0 - smoothstep(0.0, aLen * 2.0, distanceFromHead);
    vBrightness = max(vBrightness, 0.3); // Minimum brightness

    // Head glow effect
    float isHead = step(distanceFromHead, 2.0);
    vBrightness += isHead * 0.7;

    // Alpha fade for tail
    vAlpha = 1.0 - smoothstep(0.0, aLen * 3.0, distanceFromHead);
    vAlpha = max(vAlpha, 0.2);

    // Slight column jitter
    float xJitter = sin(aColumn * 123.456 + uTime * 0.1) * 0.5;

    // Mouse parallax effect
    vec2 mouseOffset = (uMouse - 0.5) * uParallaxStrength;

    vec3 pos = position;
    pos.x += xJitter + mouseOffset.x * 10.0;
    pos.y = yPos + mouseOffset.y * 5.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment Shader - handles glyph rendering and coloring
const fragmentShader = `
  uniform sampler2D uAtlas;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uGlyphCount;

  varying vec2 vUv;
  varying float vGlyph;
  varying float vBrightness;
  varying float vAlpha;

  void main() {
    // Calculate UV coordinates for glyph in atlas
    // Assuming atlas is a grid of glyphs
    float glyphsPerRow = 16.0;
    float glyphIndex = mod(vGlyph + floor(uTime * 2.0), uGlyphCount);

    float glyphX = mod(glyphIndex, glyphsPerRow);
    float glyphY = floor(glyphIndex / glyphsPerRow);

    vec2 glyphSize = vec2(1.0 / glyphsPerRow);
    vec2 glyphUV = vec2(glyphX, glyphY) * glyphSize + vUv * glyphSize;

    // Sample the atlas texture
    vec4 texColor = texture2D(uAtlas, glyphUV);

    // Apply neon green color
    vec3 finalColor = uColor * vBrightness;

    // Combine with texture alpha
    float alpha = texColor.a * vAlpha;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Matrix Rain Component using instanced geometry
function MatrixRain({ mousePosition, reducedMotion }) {
  const meshRef = useRef();
  const { viewport, size } = useThree();
  const [atlasTexture, setAtlasTexture] = useState(null);

  // Create glyph atlas texture
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Japanese katakana and alphanumeric characters
    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const glyphsPerRow = 16;
    const glyphSize = 32;

    for (let i = 0; i < Math.min(chars.length, 256); i++) {
      const x = (i % glyphsPerRow) * glyphSize + glyphSize / 2;
      const y = Math.floor(i / glyphsPerRow) * glyphSize + glyphSize / 2;
      ctx.fillText(chars[i], x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    setAtlasTexture(texture);
  }, []);

  // Generate instanced geometry with attributes
  const { geometry, instanceCount } = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const columnCount = isMobile ? 40 : 100;
    const charsPerColumn = 20;
    const count = columnCount * charsPerColumn;

    const geo = new THREE.PlaneGeometry(1.5, 2);
    const instancedGeo = new THREE.InstancedBufferGeometry();

    // Copy base geometry attributes
    instancedGeo.index = geo.index;
    instancedGeo.attributes.position = geo.attributes.position;
    instancedGeo.attributes.uv = geo.attributes.uv;

    // Create instanced attributes
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);
    const glyphs = new Float32Array(count);
    const columns = new Float32Array(count);
    const lengths = new Float32Array(count);
    const positions = new Float32Array(count * 3);

    const columnWidth = viewport.width / columnCount;

    for (let i = 0; i < columnCount; i++) {
      for (let j = 0; j < charsPerColumn; j++) {
        const idx = i * charsPerColumn + j;

        // Random offset for staggered start
        offsets[idx] = Math.random() * viewport.height * 2;

        // Random speed (faster on desktop)
        speeds[idx] = (isMobile ? 2 : 5) + Math.random() * (isMobile ? 3 : 10);

        // Random glyph index
        glyphs[idx] = Math.floor(Math.random() * 80);

        // Column index
        columns[idx] = i;

        // Trail length
        lengths[idx] = 5 + Math.random() * 10;

        // Position
        const x = (i - columnCount / 2) * columnWidth;
        const y = j * 3;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = 0;
      }
    }

    instancedGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 1));
    instancedGeo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1));
    instancedGeo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyphs, 1));
    instancedGeo.setAttribute('aColumn', new THREE.InstancedBufferAttribute(columns, 1));
    instancedGeo.setAttribute('aLen', new THREE.InstancedBufferAttribute(lengths, 1));

    return { geometry: instancedGeo, instanceCount: count };
  }, [viewport.width, viewport.height]);

  // Shader material with uniforms
  const material = useMemo(() => {
    if (!atlasTexture) return null;

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
        uAtlas: { value: atlasTexture },
        uColor: { value: new THREE.Color('#00FF00') },
        uGlyphCount: { value: 80 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uParallaxStrength: { value: reducedMotion ? 0 : 20 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [atlasTexture, viewport.width, viewport.height, reducedMotion]);

  // Animation loop
  useFrame((state) => {
    if (meshRef.current && material) {
      const speed = reducedMotion ? 0.5 : 1;
      material.uniforms.uTime.value = state.clock.elapsedTime * speed;
      material.uniforms.uMouse.value.set(mousePosition.x, mousePosition.y);
    }
  });

  if (!material) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instanceCount]}
      frustumCulled={false}
    />
  );
}

// Main Canvas Component
export default function MatrixCanvas() {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!reducedMotion) {
        setMousePosition({
          x: e.clientX / window.innerWidth,
          y: 1 - e.clientY / window.innerHeight,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reducedMotion]);

  return (
    <div className="canvas-full">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <MatrixRain mousePosition={mousePosition} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
