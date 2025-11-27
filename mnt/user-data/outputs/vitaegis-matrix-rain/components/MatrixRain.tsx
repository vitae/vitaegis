'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

// ═══════════════════════════════════════════════════════════════════════════════
// VITAEGIS MATRIX RAIN - Inspired by Rezmason's Matrix Digital Rain
// ═══════════════════════════════════════════════════════════════════════════════
// Key concepts from Rezmason's implementation:
// 1. Glyphs are STATIONARY - only illumination waves move (sawtooth wave)
// 2. GPU-computed particle positions stored in textures (ping-pong FBO)
// 3. Bloom/glow via texture pyramid
// 4. Color mapping with dithering noise to hide banding
// 5. Multiple raindrops per column with different speeds (non-colliding)
// ═══════════════════════════════════════════════════════════════════════════════

// Matrix-style glyphs (katakana + custom symbols)
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>◊◆◇○●□■△▽';

// ═══════════════════════════════════════════════════════════════════════════════
// GLSL SHADERS - The heart of the Matrix effect
// ═══════════════════════════════════════════════════════════════════════════════

// Vertex shader for rain columns
const rainVertexShader = `
  varying vec2 vUv;
  varying float vColumnIndex;
  attribute float columnIndex;
  
  void main() {
    vUv = uv;
    vColumnIndex = columnIndex;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader - Sawtooth wave illumination with bloom-ready output
const rainFragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uGlyphTexture;
  uniform float uColumns;
  uniform float uRows;
  uniform float uFallSpeed;
  uniform float uGlyphSize;
  uniform float uCursorIntensity;
  uniform float uTrailLength;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform vec3 uCursorColor;
  uniform float uDitherAmount;
  
  varying vec2 vUv;
  varying float vColumnIndex;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Noise functions for organic variation and dithering
  // ─────────────────────────────────────────────────────────────────────────────
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  
  float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  
  // Smooth noise for organic movement
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Sawtooth wave function - Core of Rezmason's raindrop illumination
  // Multiple overlapping sawteeth create the multi-raindrop effect
  // ─────────────────────────────────────────────────────────────────────────────
  
  float sawtooth(float x, float period) {
    return fract(x / period);
  }
  
  // Raindrop brightness calculation using modulated sawtooth waves
  float calculateRainBrightness(float row, float col, float time) {
    // Per-column randomization for organic feel
    float colSeed = hash(vec2(col, 0.0));
    float colSeed2 = hash(vec2(col, 1.0));
    float colSeed3 = hash(vec2(col, 2.0));
    
    // Variable speeds per column (Rezmason uses this for visual interest)
    float speed1 = uFallSpeed * (0.5 + colSeed * 1.0);
    float speed2 = uFallSpeed * (0.3 + colSeed2 * 0.8);
    float speed3 = uFallSpeed * (0.7 + colSeed3 * 0.6);
    
    // Variable raindrop lengths (tooth widths)
    float length1 = uTrailLength * (0.5 + colSeed2 * 1.0);
    float length2 = uTrailLength * (0.3 + colSeed3 * 0.8);
    float length3 = uTrailLength * (0.6 + colSeed * 0.7);
    
    // Phase offsets prevent collision and add variety
    float phase1 = colSeed * 100.0;
    float phase2 = colSeed2 * 100.0 + 33.3;
    float phase3 = colSeed3 * 100.0 + 66.6;
    
    // Sawtooth waves for each raindrop stream
    float saw1 = sawtooth(row + time * speed1 + phase1, length1 * 2.0 + 8.0);
    float saw2 = sawtooth(row + time * speed2 + phase2, length2 * 2.0 + 12.0);
    float saw3 = sawtooth(row + time * speed3 + phase3, length3 * 2.0 + 6.0);
    
    // Convert sawtooth to raindrop brightness (bright at tip, fading trail)
    float drop1 = smoothstep(0.0, 0.1, saw1) * smoothstep(length1 / (length1 * 2.0 + 8.0), 0.0, saw1);
    float drop2 = smoothstep(0.0, 0.1, saw2) * smoothstep(length2 / (length2 * 2.0 + 12.0), 0.0, saw2);
    float drop3 = smoothstep(0.0, 0.1, saw3) * smoothstep(length3 / (length3 * 2.0 + 6.0), 0.0, saw3);
    
    // Combine with max (raindrops don't add, they overlay)
    return max(max(drop1, drop2 * 0.7), drop3 * 0.5);
  }
  
  // Cursor (tracer) brightness - the bright tip of each raindrop
  float calculateCursorBrightness(float row, float col, float time) {
    float colSeed = hash(vec2(col, 0.0));
    float colSeed2 = hash(vec2(col, 1.0));
    
    float speed1 = uFallSpeed * (0.5 + colSeed * 1.0);
    float speed2 = uFallSpeed * (0.3 + colSeed2 * 0.8);
    
    float length1 = uTrailLength * (0.5 + colSeed2 * 1.0);
    float length2 = uTrailLength * (0.3 + hash(vec2(col, 2.0)) * 0.8);
    
    float phase1 = colSeed * 100.0;
    float phase2 = colSeed2 * 100.0 + 33.3;
    
    float saw1 = sawtooth(row + time * speed1 + phase1, length1 * 2.0 + 8.0);
    float saw2 = sawtooth(row + time * speed2 + phase2, length2 * 2.0 + 12.0);
    
    // Sharp cursor at the very tip
    float cursor1 = smoothstep(0.03, 0.0, saw1);
    float cursor2 = smoothstep(0.03, 0.0, saw2);
    
    return max(cursor1, cursor2 * 0.8) * uCursorIntensity;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Glyph rendering - Cycling through symbols
  // ─────────────────────────────────────────────────────────────────────────────
  
  float getGlyphIndex(float col, float row, float time) {
    // Slow cycling of glyphs (not all at once, staggered)
    float cycleSpeed = 0.3;
    float cellSeed = hash(vec2(col, row));
    float cycleOffset = cellSeed * 100.0;
    
    // Glyphs cycle at different rates for organic feel
    float cycleTime = time * cycleSpeed * (0.5 + cellSeed * 1.0) + cycleOffset;
    
    return floor(mod(cycleTime, 64.0));
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Main fragment shader
  // ─────────────────────────────────────────────────────────────────────────────
  
  void main() {
    vec2 uv = vUv;
    
    // Calculate grid position
    float col = floor(uv.x * uColumns);
    float row = floor(uv.y * uRows);
    
    // Local UV within cell
    vec2 cellUv = fract(vec2(uv.x * uColumns, uv.y * uRows));
    
    // Calculate raindrop brightness using sawtooth waves
    float brightness = calculateRainBrightness(row, col, uTime);
    float cursorBrightness = calculateCursorBrightness(row, col, uTime);
    
    // Glyph cycling
    float glyphIdx = getGlyphIndex(col, row, uTime);
    
    // Sample glyph from texture atlas (8x8 grid)
    float glyphRow = floor(glyphIdx / 8.0);
    float glyphCol = mod(glyphIdx, 8.0);
    vec2 glyphUv = (vec2(glyphCol, 7.0 - glyphRow) + cellUv) / 8.0;
    
    float glyph = texture2D(uGlyphTexture, glyphUv).r;
    
    // Apply glyph mask to brightness
    float finalBrightness = glyph * brightness;
    float finalCursor = glyph * cursorBrightness;
    
    // Color mixing
    vec3 trailColor = mix(uSecondaryColor, uPrimaryColor, brightness);
    vec3 cursorColor = uCursorColor;
    
    vec3 color = trailColor * finalBrightness + cursorColor * finalCursor;
    
    // Dithering to hide color banding (Rezmason technique)
    float dither = (hash(gl_FragCoord.xy + uTime) - 0.5) * uDitherAmount;
    color += dither;
    
    // Subtle scanlines for CRT feel
    float scanline = sin(gl_FragCoord.y * 2.0) * 0.03 + 0.97;
    color *= scanline;
    
    // Output with alpha for compositing
    float alpha = max(finalBrightness, finalCursor);
    gl_FragColor = vec4(color, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Color grading shader for final output
// ─────────────────────────────────────────────────────────────────────────────

const colorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignetteIntensity: { value: 0.4 },
    uSaturation: { value: 1.2 },
    uGamma: { value: 1.1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVignetteIntensity;
    uniform float uSaturation;
    uniform float uGamma;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Vignette
      vec2 vignetteUv = vUv * 2.0 - 1.0;
      float vignette = 1.0 - dot(vignetteUv, vignetteUv) * uVignetteIntensity;
      color.rgb *= vignette;
      
      // Saturation boost
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(luminance), color.rgb, uSaturation);
      
      // Gamma correction
      color.rgb = pow(color.rgb, vec3(1.0 / uGamma));
      
      gl_FragColor = color;
    }
  `,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLYPH TEXTURE GENERATOR
// Creates a texture atlas of Matrix-style glyphs
// ═══════════════════════════════════════════════════════════════════════════════

function createGlyphTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 512;
  const glyphsPerRow = 8;
  const glyphSize = size / glyphsPerRow;
  
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  
  // Use a monospace font that resembles Matrix glyphs
  ctx.font = `bold ${glyphSize * 0.7}px "MS Gothic", "Yu Gothic", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  
  const glyphArray = GLYPHS.split('');
  
  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / glyphsPerRow);
    const col = i % glyphsPerRow;
    const x = col * glyphSize + glyphSize / 2;
    const y = row * glyphSize + glyphSize / 2;
    
    const glyph = glyphArray[i % glyphArray.length];
    ctx.fillText(glyph, x, y);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  return texture;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface MatrixRainProps {
  /** Number of columns in the grid */
  columns?: number;
  /** Primary green color (hex) */
  primaryColor?: string;
  /** Secondary/dim color (hex) */
  secondaryColor?: string;
  /** Cursor/tracer color (hex) */
  cursorColor?: string;
  /** Fall speed multiplier */
  fallSpeed?: number;
  /** Trail length multiplier */
  trailLength?: number;
  /** Bloom intensity (0-1) */
  bloomStrength?: number;
  /** Bloom radius */
  bloomRadius?: number;
  /** Opacity of the entire effect */
  opacity?: number;
  /** Z-index for layering */
  zIndex?: number;
  /** Whether to show the effect */
  enabled?: boolean;
}

export default function MatrixRain({
  columns = 80,
  primaryColor = '#00ff41',
  secondaryColor = '#003300',
  cursorColor = '#ffffff',
  fallSpeed = 1.0,
  trailLength = 8.0,
  bloomStrength = 0.6,
  bloomRadius = 0.4,
  opacity = 1.0,
  zIndex = -1,
  enabled = true,
}: MatrixRainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const frameIdRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  
  // Convert hex to RGB vec3
  const hexToVec3 = useCallback((hex: string): THREE.Vector3 => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return new THREE.Vector3(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      );
    }
    return new THREE.Vector3(0, 1, 0.25); // Default green
  }, []);
  
  useEffect(() => {
    if (!containerRef.current || !enabled) return;
    
    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const rows = Math.floor(columns / aspect);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Scene setup
    // ─────────────────────────────────────────────────────────────────────────
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    cameraRef.current = camera;
    
    // ─────────────────────────────────────────────────────────────────────────
    // Renderer setup with high quality settings
    // ─────────────────────────────────────────────────────────────────────────
    
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // ─────────────────────────────────────────────────────────────────────────
    // Create glyph texture atlas
    // ─────────────────────────────────────────────────────────────────────────
    
    const glyphTexture = createGlyphTexture();
    
    // ─────────────────────────────────────────────────────────────────────────
    // Shader material with all uniforms
    // ─────────────────────────────────────────────────────────────────────────
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uGlyphTexture: { value: glyphTexture },
        uColumns: { value: columns },
        uRows: { value: rows },
        uFallSpeed: { value: fallSpeed },
        uGlyphSize: { value: 1.0 },
        uCursorIntensity: { value: 2.0 },
        uTrailLength: { value: trailLength },
        uPrimaryColor: { value: hexToVec3(primaryColor) },
        uSecondaryColor: { value: hexToVec3(secondaryColor) },
        uCursorColor: { value: hexToVec3(cursorColor) },
        uDitherAmount: { value: 0.03 },
      },
      vertexShader: rainVertexShader,
      fragmentShader: rainFragmentShader,
      transparent: true,
      depthTest: false,
    });
    materialRef.current = material;
    
    // ─────────────────────────────────────────────────────────────────────────
    // Full-screen quad geometry
    // ─────────────────────────────────────────────────────────────────────────
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Post-processing (Bloom + Color Grading)
    // ─────────────────────────────────────────────────────────────────────────
    
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Bloom pass for glow effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomStrength,
      bloomRadius,
      0.1 // threshold
    );
    composer.addPass(bloomPass);
    
    // Color grading pass
    const colorGradePass = new ShaderPass(colorGradeShader);
    composer.addPass(colorGradePass);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Animation loop
    // ─────────────────────────────────────────────────────────────────────────
    
    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed;
      }
      
      composer.render();
      frameIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // ─────────────────────────────────────────────────────────────────────────
    // Resize handler
    // ─────────────────────────────────────────────────────────────────────────
    
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const newAspect = newWidth / newHeight;
      const newRows = Math.floor(columns / newAspect);
      
      renderer.setSize(newWidth, newHeight);
      composer.setSize(newWidth, newHeight);
      
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(newWidth, newHeight);
        materialRef.current.uniforms.uRows.value = newRows;
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────────────────────────────────────
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      glyphTexture.dispose();
    };
  }, [enabled, columns, primaryColor, secondaryColor, cursorColor, fallSpeed, trailLength, bloomStrength, bloomRadius, hexToVec3]);
  
  if (!enabled) return null;
  
  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex,
        opacity,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
