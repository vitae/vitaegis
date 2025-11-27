'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

// ═══════════════════════════════════════════════════════════════════════════════
// VITAEGIS MATRIX RAIN PRO - Advanced Implementation
// ═══════════════════════════════════════════════════════════════════════════════
// Enhanced features:
// - Volumetric 3D depth effect
// - Multiple raindrop streams with variable parameters
// - Authentic glyph cycling based on Rezmason's research
// - Advanced bloom with color-aware thresholding
// - Chromatic aberration for depth
// - Optional intro sequence
// - Performance optimizations for mobile
// ═══════════════════════════════════════════════════════════════════════════════

// Extended glyph set including Resurrections characters
const MATRIX_GLYPHS = 
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ' +
  '0123456789' +
  '∀∂∃∄∅∆∇∈∉∊∋∌∍∎∏∐∑−∓∔∕∖∗∘∙√∛∜∝∞∟∠∡∢∣∤∥∦∧∨∩∪' +
  '☰☱☲☳☴☵☶☷' +
  '═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬';

// ═══════════════════════════════════════════════════════════════════════════════
// SHADER CODE
// ═══════════════════════════════════════════════════════════════════════════════

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Main rain shader with full Rezmason-style implementation
const fragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uGlyphTexture;
  uniform float uColumns;
  uniform float uRows;
  uniform float uFallSpeed;
  uniform float uCycleSpeed;
  uniform float uCursorIntensity;
  uniform float uTrailLength;
  uniform float uSlant;
  uniform float uDepthLayers;
  uniform float uDepthFade;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform vec3 uBackgroundColor;
  uniform vec3 uCursorColor;
  uniform vec3 uGlintColor;
  uniform float uGlintIntensity;
  uniform float uDitherMagnitude;
  uniform float uIntroProgress;
  uniform float uRippleTime;
  uniform vec2 uRippleCenter;
  uniform float uRippleStrength;
  
  varying vec2 vUv;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Noise and hash functions
  // ─────────────────────────────────────────────────────────────────────────────
  
  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }
  
  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  
  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  
  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }
  
  // Simplex-like noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Raindrop system - Core algorithm from Rezmason
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Sawtooth wave with modulated width (key insight from Rezmason)
  float modulatedSawtooth(float x, float period, float seed) {
    // Modulate the period slightly for organic feel
    float modPeriod = period * (0.8 + 0.4 * noise(vec2(seed, x * 0.01)));
    return fract(x / modPeriod);
  }
  
  struct RaindropResult {
    float brightness;
    float cursor;
    float glint;
  };
  
  RaindropResult calculateRaindrop(float row, float col, float time, float layerDepth) {
    RaindropResult result;
    result.brightness = 0.0;
    result.cursor = 0.0;
    result.glint = 0.0;
    
    // Per-column seeds for consistent randomization
    float seed1 = hash21(vec2(col, layerDepth));
    float seed2 = hash21(vec2(col + 100.0, layerDepth));
    float seed3 = hash21(vec2(col + 200.0, layerDepth));
    float seed4 = hash21(vec2(col + 300.0, layerDepth));
    
    // Multiple raindrop streams per column (non-colliding via phase offset)
    const int NUM_STREAMS = 3;
    
    for (int i = 0; i < NUM_STREAMS; i++) {
      float streamSeed = hash21(vec2(col, float(i) + layerDepth * 10.0));
      float streamSeed2 = hash21(vec2(col + 50.0, float(i) + layerDepth * 10.0));
      
      // Variable speed per stream
      float speed = uFallSpeed * (0.4 + streamSeed * 0.8) * (1.0 - layerDepth * 0.3);
      
      // Variable raindrop length (Rezmason's "tooth width")
      float dropLength = uTrailLength * (0.5 + streamSeed2 * 1.0);
      
      // Phase offset prevents collision
      float phase = streamSeed * 50.0 + float(i) * 33.3;
      
      // Period between raindrops
      float period = dropLength * 2.5 + 5.0 + streamSeed * 10.0;
      
      // Calculate sawtooth position
      float sawPos = fract((row + time * speed + phase) / period);
      
      // Convert to raindrop brightness (bright at tip, fading trail)
      float dropStart = 0.0;
      float dropEnd = dropLength / period;
      
      if (sawPos < dropEnd) {
        // Within the raindrop
        float normalized = sawPos / dropEnd;
        
        // Exponential falloff for trail (Rezmason style)
        float trail = exp(-normalized * 4.0);
        
        // Intensity varies by stream
        float intensity = 1.0 - float(i) * 0.25;
        
        result.brightness = max(result.brightness, trail * intensity);
        
        // Cursor at the very tip
        float cursorWidth = 0.05;
        if (sawPos < cursorWidth) {
          float cursorIntensity = smoothstep(cursorWidth, 0.0, sawPos);
          result.cursor = max(result.cursor, cursorIntensity * intensity);
        }
        
        // Occasional glint (bright flash on random glyphs)
        if (streamSeed > 0.7 && sawPos < 0.15 && sawPos > 0.05) {
          float glintChance = hash31(vec3(col, row, floor(time * 2.0)));
          if (glintChance > 0.95) {
            result.glint = 1.0;
          }
        }
      }
    }
    
    return result;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Glyph system
  // ─────────────────────────────────────────────────────────────────────────────
  
  float getGlyphIndex(float col, float row, float time, float brightness) {
    // Glyphs cycle at rate proportional to brightness (Rezmason observation)
    float baseCycle = hash21(vec2(col, row)) * 64.0;
    float cycleRate = uCycleSpeed * (0.3 + brightness * 0.7);
    
    // Stagger cycling based on position
    float cycleOffset = hash21(vec2(col * 0.1, row * 0.1)) * 100.0;
    
    return mod(baseCycle + time * cycleRate + cycleOffset, 64.0);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Ripple effect (operator mode)
  // ─────────────────────────────────────────────────────────────────────────────
  
  float calculateRipple(vec2 uv) {
    if (uRippleStrength <= 0.0) return 0.0;
    
    float dist = distance(uv, uRippleCenter);
    float rippleRadius = uRippleTime * 0.5;
    float rippleWidth = 0.1;
    
    float ripple = smoothstep(rippleRadius - rippleWidth, rippleRadius, dist) *
                   smoothstep(rippleRadius + rippleWidth, rippleRadius, dist);
    
    ripple *= exp(-uRippleTime * 2.0) * uRippleStrength;
    
    return ripple;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Main shader
  // ─────────────────────────────────────────────────────────────────────────────
  
  void main() {
    vec2 uv = vUv;
    
    // Apply slant
    float slantOffset = (uv.y - 0.5) * tan(uSlant * 0.0174533);
    uv.x = fract(uv.x + slantOffset);
    
    // Grid position
    float col = floor(uv.x * uColumns);
    float row = floor((1.0 - uv.y) * uRows); // Flip Y so rain falls down
    
    // Cell-local UV
    vec2 cellUv = fract(vec2(uv.x * uColumns, (1.0 - uv.y) * uRows));
    
    // Accumulate layers for depth effect
    vec3 finalColor = uBackgroundColor;
    float totalAlpha = 0.0;
    
    int numLayers = int(uDepthLayers);
    
    for (int layer = 0; layer < 4; layer++) {
      if (layer >= numLayers) break;
      
      float layerDepth = float(layer) / float(numLayers);
      float layerScale = 1.0 - layerDepth * 0.3;
      float layerAlpha = 1.0 - layerDepth * uDepthFade;
      
      // Offset columns per layer for parallax
      float layerCol = col + float(layer) * 0.5;
      float layerRow = row * layerScale;
      
      // Calculate raindrop
      RaindropResult rain = calculateRaindrop(layerRow, layerCol, uTime, layerDepth);
      
      // Get glyph
      float glyphIdx = getGlyphIndex(layerCol, row, uTime, rain.brightness);
      
      // Sample glyph texture (8x8 atlas)
      float glyphRow = floor(glyphIdx / 8.0);
      float glyphCol = mod(glyphIdx, 8.0);
      vec2 glyphUv = (vec2(glyphCol, 7.0 - glyphRow) + cellUv) / 8.0;
      float glyph = texture2D(uGlyphTexture, glyphUv).r;
      
      // Apply glyph mask
      float maskedBrightness = glyph * rain.brightness;
      float maskedCursor = glyph * rain.cursor;
      float maskedGlint = glyph * rain.glint;
      
      // Color calculation
      vec3 trailColor = mix(uSecondaryColor, uPrimaryColor, rain.brightness);
      vec3 cursorColor = uCursorColor;
      vec3 glintColor = uGlintColor;
      
      vec3 layerColor = trailColor * maskedBrightness +
                        cursorColor * maskedCursor * uCursorIntensity +
                        glintColor * maskedGlint * uGlintIntensity;
      
      // Depth-based dimming
      layerColor *= layerAlpha;
      
      // Composite layer
      float layerVisibility = max(maskedBrightness, max(maskedCursor, maskedGlint)) * layerAlpha;
      finalColor = mix(finalColor, layerColor, layerVisibility * (1.0 - totalAlpha));
      totalAlpha = min(1.0, totalAlpha + layerVisibility);
    }
    
    // Ripple effect
    float ripple = calculateRipple(vUv);
    finalColor += uPrimaryColor * ripple;
    
    // Intro sequence (fade in from edges)
    if (uIntroProgress < 1.0) {
      float introMask = smoothstep(0.0, uIntroProgress, 1.0 - abs(vUv.x - 0.5) * 2.0);
      introMask *= smoothstep(0.0, uIntroProgress, vUv.y);
      finalColor *= introMask;
    }
    
    // Dithering to hide color banding
    float dither = (hash21(gl_FragCoord.xy + fract(uTime)) - 0.5) * uDitherMagnitude;
    finalColor += dither;
    
    // Subtle scanlines
    float scanline = 0.95 + 0.05 * sin(gl_FragCoord.y * 1.5);
    finalColor *= scanline;
    
    // Subtle horizontal noise lines (CRT effect)
    float noiseLines = 0.98 + 0.02 * noise(vec2(vUv.y * 500.0, uTime * 10.0));
    finalColor *= noiseLines;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Post-processing: Chromatic aberration + vignette
const postProcessShader = {
  uniforms: {
    tDiffuse: { value: null },
    uChromaticAberration: { value: 0.002 },
    uVignette: { value: 0.4 },
    uScanlineIntensity: { value: 0.05 },
    uNoiseIntensity: { value: 0.02 },
    uTime: { value: 0 },
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
    uniform float uChromaticAberration;
    uniform float uVignette;
    uniform float uScanlineIntensity;
    uniform float uNoiseIntensity;
    uniform float uTime;
    varying vec2 vUv;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float dist = length(center);
      
      // Chromatic aberration
      vec2 caOffset = center * uChromaticAberration * dist;
      
      float r = texture2D(tDiffuse, uv + caOffset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - caOffset).b;
      
      vec3 color = vec3(r, g, b);
      
      // Vignette
      float vignette = 1.0 - dist * dist * uVignette * 2.0;
      color *= vignette;
      
      // Film grain
      float grain = (hash(uv * 1000.0 + uTime) - 0.5) * uNoiseIntensity;
      color += grain;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLYPH TEXTURE GENERATOR (Enhanced)
// ═══════════════════════════════════════════════════════════════════════════════

function createGlyphTexture(glyphSet: string = MATRIX_GLYPHS): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 1024; // Higher resolution for crisp glyphs
  const glyphsPerRow = 8;
  const glyphSize = size / glyphsPerRow;
  
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d')!;
  
  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  
  // Configure text rendering
  ctx.font = `bold ${glyphSize * 0.75}px "MS Gothic", "Yu Gothic", "Noto Sans JP", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  
  // Enable font smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  const glyphArray = [...glyphSet];
  
  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / glyphsPerRow);
    const col = i % glyphsPerRow;
    const x = col * glyphSize + glyphSize / 2;
    const y = row * glyphSize + glyphSize / 2;
    
    // Cycle through available glyphs
    const glyph = glyphArray[i % glyphArray.length];
    
    // Draw with slight glow effect
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 2;
    ctx.fillText(glyph, x, y);
    ctx.shadowBlur = 0;
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  
  return texture;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatrixRainProProps {
  // Layout
  columns?: number;
  
  // Colors (Vitaegis defaults)
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  cursorColor?: string;
  glintColor?: string;
  
  // Animation
  fallSpeed?: number;
  cycleSpeed?: number;
  trailLength?: number;
  slant?: number;
  
  // Effects
  cursorIntensity?: number;
  glintIntensity?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  chromaticAberration?: number;
  vignetteIntensity?: number;
  ditherMagnitude?: number;
  
  // Depth (volumetric)
  depthLayers?: number;
  depthFade?: number;
  
  // Intro
  skipIntro?: boolean;
  introDuration?: number;
  
  // Display
  opacity?: number;
  zIndex?: number;
  enabled?: boolean;
  
  // Performance
  pixelRatio?: number;
  
  // Callbacks
  onReady?: () => void;
  onClick?: (x: number, y: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MatrixRainPro({
  columns = 80,
  primaryColor = '#00ff41',
  secondaryColor = '#003311',
  backgroundColor = '#000000',
  cursorColor = '#ffffff',
  glintColor = '#88ffaa',
  fallSpeed = 1.0,
  cycleSpeed = 0.5,
  trailLength = 8.0,
  slant = 0,
  cursorIntensity = 2.0,
  glintIntensity = 0.5,
  bloomStrength = 0.5,
  bloomRadius = 0.3,
  bloomThreshold = 0.2,
  chromaticAberration = 0.002,
  vignetteIntensity = 0.3,
  ditherMagnitude = 0.04,
  depthLayers = 1,
  depthFade = 0.5,
  skipIntro = true,
  introDuration = 3.0,
  opacity = 1.0,
  zIndex = -1,
  enabled = true,
  pixelRatio,
  onReady,
  onClick,
}: MatrixRainProProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const postPassRef = useRef<ShaderPass | null>(null);
  const frameIdRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const introStartRef = useRef<number>(Date.now());
  const rippleRef = useRef<{ time: number; center: THREE.Vector2; strength: number }>({
    time: 0,
    center: new THREE.Vector2(0.5, 0.5),
    strength: 0,
  });
  
  // Hex to Vec3 conversion
  const hexToVec3 = useCallback((hex: string): THREE.Vector3 => {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (match) {
      return new THREE.Vector3(
        parseInt(match[1], 16) / 255,
        parseInt(match[2], 16) / 255,
        parseInt(match[3], 16) / 255
      );
    }
    return new THREE.Vector3(0, 1, 0.25);
  }, []);
  
  // Memoize color conversions
  const colors = useMemo(() => ({
    primary: hexToVec3(primaryColor),
    secondary: hexToVec3(secondaryColor),
    background: hexToVec3(backgroundColor),
    cursor: hexToVec3(cursorColor),
    glint: hexToVec3(glintColor),
  }), [primaryColor, secondaryColor, backgroundColor, cursorColor, glintColor, hexToVec3]);
  
  // Click handler for ripple effect
  const handleClick = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    
    rippleRef.current = {
      time: 0,
      center: new THREE.Vector2(x, y),
      strength: 1.0,
    };
    
    onClick?.(x, y);
  }, [onClick]);
  
  useEffect(() => {
    if (!containerRef.current || !enabled) return;
    
    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const rows = Math.floor(columns / aspect);
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false, // Disable for performance
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
    });
    
    const effectivePixelRatio = pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    renderer.setSize(width, height);
    renderer.setPixelRatio(effectivePixelRatio);
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Glyph texture
    const glyphTexture = createGlyphTexture();
    
    // Main material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uGlyphTexture: { value: glyphTexture },
        uColumns: { value: columns },
        uRows: { value: rows },
        uFallSpeed: { value: fallSpeed },
        uCycleSpeed: { value: cycleSpeed },
        uCursorIntensity: { value: cursorIntensity },
        uTrailLength: { value: trailLength },
        uSlant: { value: slant },
        uDepthLayers: { value: depthLayers },
        uDepthFade: { value: depthFade },
        uPrimaryColor: { value: colors.primary },
        uSecondaryColor: { value: colors.secondary },
        uBackgroundColor: { value: colors.background },
        uCursorColor: { value: colors.cursor },
        uGlintColor: { value: colors.glint },
        uGlintIntensity: { value: glintIntensity },
        uDitherMagnitude: { value: ditherMagnitude },
        uIntroProgress: { value: skipIntro ? 1.0 : 0.0 },
        uRippleTime: { value: 0 },
        uRippleCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uRippleStrength: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    materialRef.current = material;
    
    // Geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Post-processing
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);
    
    // Final post-processing
    const postPass = new ShaderPass(postProcessShader);
    postPass.uniforms.uChromaticAberration.value = chromaticAberration;
    postPass.uniforms.uVignette.value = vignetteIntensity;
    composer.addPass(postPass);
    postPassRef.current = postPass;
    
    // Track intro start
    introStartRef.current = Date.now();
    startTimeRef.current = Date.now();
    
    // Animation loop
    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      const introElapsed = (now - introStartRef.current) / 1000;
      
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed;
        
        // Intro progress
        if (!skipIntro) {
          materialRef.current.uniforms.uIntroProgress.value = 
            Math.min(1.0, introElapsed / introDuration);
        }
        
        // Update ripple
        if (rippleRef.current.strength > 0) {
          rippleRef.current.time += 0.016;
          materialRef.current.uniforms.uRippleTime.value = rippleRef.current.time;
          materialRef.current.uniforms.uRippleCenter.value = rippleRef.current.center;
          materialRef.current.uniforms.uRippleStrength.value = rippleRef.current.strength;
          
          // Fade out ripple
          rippleRef.current.strength *= 0.98;
          if (rippleRef.current.strength < 0.01) {
            rippleRef.current.strength = 0;
          }
        }
      }
      
      if (postPassRef.current) {
        postPassRef.current.uniforms.uTime.value = elapsed;
      }
      
      composer.render();
      frameIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    onReady?.();
    
    // Event listeners
    container.addEventListener('click', handleClick);
    
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
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', handleClick);
      cancelAnimationFrame(frameIdRef.current);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      glyphTexture.dispose();
      composer.dispose();
    };
  }, [
    enabled, columns, colors, fallSpeed, cycleSpeed, trailLength, slant,
    cursorIntensity, glintIntensity, bloomStrength, bloomRadius, bloomThreshold,
    chromaticAberration, vignetteIntensity, ditherMagnitude, depthLayers, depthFade,
    skipIntro, introDuration, pixelRatio, onReady, handleClick
  ]);
  
  // Update uniforms when props change
  useEffect(() => {
    if (!materialRef.current) return;
    
    materialRef.current.uniforms.uPrimaryColor.value = colors.primary;
    materialRef.current.uniforms.uSecondaryColor.value = colors.secondary;
    materialRef.current.uniforms.uBackgroundColor.value = colors.background;
    materialRef.current.uniforms.uCursorColor.value = colors.cursor;
    materialRef.current.uniforms.uGlintColor.value = colors.glint;
    materialRef.current.uniforms.uFallSpeed.value = fallSpeed;
    materialRef.current.uniforms.uCycleSpeed.value = cycleSpeed;
    materialRef.current.uniforms.uTrailLength.value = trailLength;
    materialRef.current.uniforms.uCursorIntensity.value = cursorIntensity;
    materialRef.current.uniforms.uGlintIntensity.value = glintIntensity;
    materialRef.current.uniforms.uDitherMagnitude.value = ditherMagnitude;
    materialRef.current.uniforms.uDepthLayers.value = depthLayers;
    materialRef.current.uniforms.uDepthFade.value = depthFade;
    materialRef.current.uniforms.uSlant.value = slant;
  }, [colors, fallSpeed, cycleSpeed, trailLength, cursorIntensity, glintIntensity, ditherMagnitude, depthLayers, depthFade, slant]);
  
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
        pointerEvents: onClick ? 'auto' : 'none',
        cursor: onClick ? 'crosshair' : 'default',
      }}
      aria-hidden="true"
    />
  );
}
