'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// ============================================================================
// CONFIGURATION - Based on Rezmason's Matrix 3D implementation
// Key concepts from https://github.com/Rezmason/matrix:
// - Sawtooth wave for raindrop animation (multiple per column, no collisions)
// - MSDF for crisp glyphs
// - GPU-side particle computation
// - Bloom + tone-mapping for the green glow
// - Volumetric depth with forward movement
// ============================================================================
const CONFIG = {
  // Grid settings
  numColumns: 80,
  numRows: 50,
  numLayers: 8,
  
  // Animation (Rezmason defaults)
  fallSpeed: 0.3,
  forwardSpeed: 1.0,
  cycleSpeed: 1.0,
  raindropLength: 0.4,
  
  // Visual
  glyphSize: 0.35,
  bloomStrength: 1.8,
  bloomRadius: 0.5,
  ditherMagnitude: 0.05,
  
  // Colors (authentic Matrix palette)
  backgroundColor: '#000000',
  primaryColor: '#00ff41',
  secondaryColor: '#003b00',
  cursorColor: '#aaffaa',
  cursorIntensity: 2.0,
};

// Matrix glyphs - Katakana + special symbols (authentic set)
const MATRIX_GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ0123456789ABCDEFZ∀∂∃∅∆∇∈∉∋∏∑√∝∞∠∧∨∩∪∫≈≠≡≤≥⊂⊃⊕⊗';

// ============================================================================
// VERTEX SHADER - Rezmason-style volumetric raindrop animation
// ============================================================================
const matrixVertexShader = `
  precision highp float;
  
  uniform float uTime;
  uniform float uFallSpeed;
  uniform float uForwardSpeed;
  uniform float uNumColumns;
  uniform float uNumRows;
  uniform float uRaindropLength;
  uniform float uGlyphSize;
  
  attribute float aColumn;
  attribute float aRow;
  attribute float aLayer;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aGlyph;
  attribute float aRaindrop;
  
  varying float vBrightness;
  varying float vIsCursor;
  varying float vGlyphIndex;
  varying float vDepthFade;
  
  
  // Sawtooth wave - core of Rezmason's raindrop animation
  // Creates non-colliding raindrops by modulating wave width
  float sawtooth(float x, float width) {
    float t = mod(x, 1.0);
    return t < width ? t / width : 0.0;
  }
  
  // Hash for deterministic randomness
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }
  
  void main() {
    
    
    // Unique seed per column/raindrop combination
    float columnSeed = aColumn * 0.173 + aRaindrop * 0.719;
    float raindropSpeed = aSpeed * uFallSpeed;
    
    // Sawtooth wave position - determines which glyphs are lit
    // Multiple raindrops per column with different phases
    float wavePos = sawtooth(
      uTime * raindropSpeed + aPhase + columnSeed,
      1.0
    );
    
    // Calculate glyph's position relative to raindrop cursor
    float rowNorm = aRow / uNumRows;
    float distFromCursor = abs(rowNorm - wavePos);
    
    // Trail with variable length (Rezmason's "tooth width" modulation)
    float trailLen = uRaindropLength * (0.7 + 0.6 * hash(columnSeed));
    float inTrail = 1.0 - smoothstep(0.0, trailLen, distFromCursor);
    
    // Cursor detection - brightest point at raindrop tip
    float cursorThreshold = 0.015;
    vIsCursor = step(distFromCursor, cursorThreshold) * inTrail;
    
    // Brightness gradient along trail (exponential falloff)
    float trailGradient = pow(1.0 - distFromCursor / max(trailLen, 0.001), 2.5);
    vBrightness = inTrail * trailGradient;
    
    // Glyph cycling animation
    float cycleOffset = floor(uTime * 3.0 + hash(aColumn + aRow * 0.13) * 8.0);
    vGlyphIndex = mod(aGlyph + cycleOffset, 256.0);
    
    // ========================================
    // VOLUMETRIC 3D POSITIONING
    // ========================================
    vec3 pos = vec3(0.0);
    
    // Column positioning (X)
    float colSpacing = 0.9;
    pos.x = (aColumn - uNumColumns * 0.5) * colSpacing;
    
    // Row positioning (Y)
    float rowSpacing = 0.7;
    pos.y = (aRow - uNumRows * 0.5) * rowSpacing;
    
    // Depth layers with forward movement (volumetric effect)
    float layerDepth = 6.0;
    float zBase = -aLayer * layerDepth;
    
    // Forward movement - glyphs approach camera
    float depthCycle = fract(uTime * uForwardSpeed * 0.08 + aLayer * 0.12 + hash(columnSeed) * 0.5);
    float zOffset = mix(-50.0, 15.0, depthCycle);
    pos.z = zBase + zOffset;
    
    // Depth-based fading
    float maxDepth = 60.0;
    vDepthFade = 1.0 - smoothstep(-15.0, -maxDepth, pos.z);
    vBrightness *= vDepthFade;
    
    // Scale by depth for perspective
    float depthScale = mix(0.4, 1.3, vDepthFade);
    pos.xy *= depthScale;
    
    // Apply MVP
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uGlyphSize * 45.0 * depthScale * (280.0 / -mvPosition.z);
  }
`;

// ============================================================================
// FRAGMENT SHADER - Glyph rendering with authentic Matrix glow
// ============================================================================
const matrixFragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform vec3 uCursorColor;
  uniform float uCursorIntensity;
  uniform float uDitherMagnitude;
  
  varying float vBrightness;
  varying float vIsCursor;
  varying float vGlyphIndex;
  varying float vDepthFade;
  
  
  // Noise for dithering (hides color banding - Rezmason technique)
  float random(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    if (vBrightness < 0.01) discard;
    
    // Glyph shape from point coordinate
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Sharp glyph core + soft glow halo
    float glyphMask = smoothstep(0.45, 0.25, dist);
    float glowMask = smoothstep(0.6, 0.0, dist);
    
    // Simulated glyph pattern (character-like texture)
    float pattern = sin(gl_PointCoord.x * 10.0 + gl_PointCoord.y * 8.0 + vGlyphIndex * 0.4);
    pattern = pattern * 0.5 + 0.5;
    pattern = smoothstep(0.3, 0.7, pattern);
    
    // Scanline effect for CRT feel
    float scanline = sin(gl_FragCoord.y * 1.2) * 0.12 + 0.88;
    
    // Color gradient (dark green -> bright green)
    vec3 color = mix(uSecondaryColor, uPrimaryColor, vBrightness);
    
    // Cursor gets bright highlight (Rezmason's isolateCursor)
    float cursorBoost = vIsCursor * uCursorIntensity;
    color = mix(color, uCursorColor, vIsCursor * 0.7);
    color *= (1.0 + cursorBoost);
    
    // Combine masks
    float alpha = glyphMask * pattern * vBrightness;
    alpha += glowMask * vBrightness * 0.35;
    alpha *= scanline;
    
    // Dithering to hide banding
    float dither = (random(gl_FragCoord.xy) - 0.5) * uDitherMagnitude;
    alpha = clamp(alpha + dither, 0.0, 1.0);
    
    // Depth-based color shift
    color = mix(color, uPrimaryColor * 0.4, (1.0 - vDepthFade) * 0.4);
    
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

// ============================================================================
// MATRIX RAIN MESH COMPONENT
// ============================================================================
function MatrixRainMesh() {
  const { numColumns, numRows, numLayers } = CONFIG;
  const particleCount = numColumns * numRows * numLayers;
  
  // Generate particle attributes
  const attributes = useMemo(() => {
    const columns = new Float32Array(particleCount);
    const rows = new Float32Array(particleCount);
    const layers = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const glyphs = new Float32Array(particleCount);
    const raindrops = new Float32Array(particleCount);
    const positions = new Float32Array(particleCount * 3);
    
    let idx = 0;
    for (let layer = 0; layer < numLayers; layer++) {
      for (let col = 0; col < numColumns; col++) {
        for (let row = 0; row < numRows; row++) {
          positions[idx * 3] = 0;
          positions[idx * 3 + 1] = 0;
          positions[idx * 3 + 2] = 0;
          
          columns[idx] = col;
          rows[idx] = row;
          layers[idx] = layer;
          phases[idx] = Math.random();
          speeds[idx] = 0.4 + Math.random() * 0.6;
          glyphs[idx] = Math.floor(Math.random() * MATRIX_GLYPHS.length);
          raindrops[idx] = Math.floor(Math.random() * 3);
          
          idx++;
        }
      }
    }
    
    return { positions, columns, rows, layers, phases, speeds, glyphs, raindrops };
  }, [particleCount, numColumns, numRows, numLayers]);
  
  // Shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: matrixVertexShader,
      fragmentShader: matrixFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uFallSpeed: { value: CONFIG.fallSpeed },
        uForwardSpeed: { value: CONFIG.forwardSpeed },
        uNumColumns: { value: CONFIG.numColumns },
        uNumRows: { value: CONFIG.numRows },
        uRaindropLength: { value: CONFIG.raindropLength },
        uGlyphSize: { value: CONFIG.glyphSize },
        uCursorIntensity: { value: CONFIG.cursorIntensity },
        uDitherMagnitude: { value: CONFIG.ditherMagnitude },
        uPrimaryColor: { value: new THREE.Color(CONFIG.primaryColor) },
        uSecondaryColor: { value: new THREE.Color(CONFIG.secondaryColor) },
        uCursorColor: { value: new THREE.Color(CONFIG.cursorColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);
  
  // Animation loop - use the memoized material directly
  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={attributes.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColumn"
          count={particleCount}
          array={attributes.columns}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRow"
          count={particleCount}
          array={attributes.rows}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aLayer"
          count={particleCount}
          array={attributes.layers}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={particleCount}
          array={attributes.phases}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={particleCount}
          array={attributes.speeds}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aGlyph"
          count={particleCount}
          array={attributes.glyphs}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRaindrop"
          count={particleCount}
          array={attributes.raindrops}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
}

// ============================================================================
// DEPTH FOG
// ============================================================================
function DepthFog() {
  const fogMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x001500) },
      },
      vertexShader: `
        
        void main() {
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = vUv;
          float n = noise(uv * 6.0 + uTime * 0.03);
          n += noise(uv * 12.0 - uTime * 0.02) * 0.5;
          n /= 1.5;
          
          vec2 center = uv - 0.5;
          float radial = 1.0 - smoothstep(0.0, 0.6, length(center));
          
          float alpha = n * radial * 0.12;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
  }, []);
  
  // Animation loop - use the memoized material directly
  useFrame((state) => {
    if (fogMaterial) {
      fogMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh position={[0, 0, -25]}>
      <planeGeometry args={[150, 150]} />
      <primitive object={fogMaterial} attach="material" />
    </mesh>
  );
}

// ============================================================================
// CAMERA RIG
// ============================================================================
function CameraRig() {
  const { camera } = useThree();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.08) * 2.5;
    camera.position.y = Math.cos(t * 0.06) * 1.5;
    camera.position.z = 35 + Math.sin(t * 0.04) * 4;
    camera.lookAt(0, 0, -15);
  });
  
  return null;
}

// ============================================================================
// SCENE COMPOSITION
// ============================================================================
function MatrixScene() {
  return (
    <>
      <color attach="background" args={[CONFIG.backgroundColor]} />
      <fog attach="fog" args={['#001100', 25, 120]} />
      
      <CameraRig />
      <DepthFog />
      <MatrixRainMesh />
      
      <EffectComposer>
        <Bloom
          intensity={CONFIG.bloomStrength}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          radius={CONFIG.bloomRadius}
          mipmapBlur
        />
        <Vignette
          offset={0.25}
          darkness={0.85}
          blendFunction={BlendFunction.NORMAL}
        />
        <Noise
          opacity={0.03}
          blendFunction={BlendFunction.OVERLAY}
        />
      </EffectComposer>
    </>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
export default function MatrixRain3DAdvanced() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div className="fixed inset-0 bg-black -z-10" />;
  }
  
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ 
          position: [0, 0, 35], 
          fov: 60, 
          near: 0.1, 
          far: 200 
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <MatrixScene />
      </Canvas>
    </div>
  );
}


