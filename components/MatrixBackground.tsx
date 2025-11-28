'use client';

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

// ============================================================================
// CONFIGURATION - Tuned to match Rezmason's Matrix 3D
// ============================================================================
const CONFIG = {
  // Grid settings
  numColumns: 80,
  numRows: 50,
  numLayers: 12, // Depth layers for volumetric effect
  
  // Animation speeds
  fallSpeed: 1.2,
  forwardSpeed: 0.4,
  cycleSpeed: 4.0,
  
  // Visual settings
  glyphSize: 0.4,
  bloomStrength: 2.0,
  bloomRadius: 0.6,
  glowIntensity: 1.5,
  
  // Colors (Matrix green palette)
  backgroundColor: '#000000',
  primaryColor: '#00ff41', // Bright matrix green
  secondaryColor: '#003b00', // Dark green
  cursorColor: '#ffffff', // White cursor tip
  glintColor: '#88ff88', // Occasional glint
  
  // Raindrop settings
  raindropLength: 0.4,
  raindropDensity: 0.7,
};

// Matrix characters - authentic set from the films
const MATRIX_GLYPHS = `
アイウエオカキクケコサシスセソタチツテトナニヌネノ
ハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴ
ザジズゼゾダヂヅデドバビブベボパピプペポ
0123456789
∀∂∃∅∆∇∈∉∋∏∑−∗√∝∞∠∧∨∩∪∫≈≠≡≤≥⊂⊃⊆⊇⊕⊗⊥
ＺＹＸＷＶＵＴＳＲＱＰＯＮＭＬＫＪＩＨＧＦＥＤＣＢＡ
`;

// ============================================================================
// VERTEX SHADER - Volumetric Matrix Rain
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
  
  attribute vec3 instancePosition;
  attribute float instanceColumn;
  attribute float instanceRow;
  attribute float instanceLayer;
  attribute float instancePhase;
  attribute float instanceSpeed;
  attribute float instanceGlyph;
  attribute float instanceRaindrop;
  
  varying float vBrightness;
  varying float vIsCursor;
  varying float vGlyphIndex;
  varying float vDepthFade;
  varying vec2 vUv;
  varying float vGlint;
  
  // Sawtooth wave function (core of Rezmason's raindrop animation)
  float sawtoothWave(float x, float period) {
    return mod(x, period) / period;
  }
  
  // Hash function for randomness
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }
  
  void main() {
    vUv = uv;
    vGlyphIndex = instanceGlyph;
    
    // ========================================
    // RAINDROP ANIMATION (Rezmason's approach)
    // ========================================
    
    // Each column has multiple raindrops with different phases
    float columnSeed = instanceColumn * 0.1 + instanceRaindrop * 0.7;
    float raindropSpeed = instanceSpeed * uFallSpeed;
    
    // Sawtooth wave creates the "streaming" effect
    // The wave's position determines which glyphs are lit
    float wavePosition = sawtoothWave(
      uTime * raindropSpeed + instancePhase + columnSeed,
      1.0
    );
    
    // Calculate this glyph's position relative to the raindrop
    float rowNormalized = instanceRow / uNumRows;
    float distanceFromCursor = abs(rowNormalized - wavePosition);
    
    // Raindrop trail with exponential falloff
    float trailLength = uRaindropLength * (0.8 + 0.4 * hash(columnSeed));
    float inTrail = 1.0 - smoothstep(0.0, trailLength, distanceFromCursor);
    
    // Cursor (tip) detection - brightest point
    float cursorThreshold = 0.02;
    vIsCursor = step(distanceFromCursor, cursorThreshold) * inTrail;
    
    // Brightness gradient along trail
    float trailGradient = pow(1.0 - distanceFromCursor / trailLength, 2.0);
    vBrightness = inTrail * trailGradient;
    
    // Random glint effect (occasional bright flash)
    float glintChance = hash(instanceColumn * 100.0 + floor(uTime * 3.0));
    vGlint = step(0.995, glintChance) * inTrail;
    
    // Glyph cycling animation
    float cycleOffset = floor(uTime * 4.0 + hash(instanceColumn + instanceRow * 0.1) * 10.0);
    vGlyphIndex = mod(instanceGlyph + cycleOffset, 256.0);
    
    // ========================================
    // VOLUMETRIC 3D POSITIONING
    // ========================================
    
    // Base position from instance
    vec3 pos = position * uGlyphSize;
    
    // Column positioning (X axis)
    float columnSpacing = 1.0;
    pos.x += (instanceColumn - uNumColumns * 0.5) * columnSpacing;
    
    // Row positioning (Y axis) - offset by wave for streaming
    float rowSpacing = 0.8;
    pos.y += (instanceRow - uNumRows * 0.5) * rowSpacing;
    
    // Depth positioning (Z axis) - layers recede into distance
    float layerDepth = 8.0;
    float zBase = -instanceLayer * layerDepth;
    
    // Animate layers approaching camera
    float depthCycle = sawtoothWave(uTime * uForwardSpeed + instanceLayer * 0.1, 1.0);
    float zOffset = mix(-60.0, 20.0, depthCycle);
    pos.z = zBase + zOffset;
    
    // Depth-based fading (further = dimmer)
    float maxDepth = uNumColumns * layerDepth;
    vDepthFade = 1.0 - smoothstep(-20.0, -maxDepth, pos.z);
    vBrightness *= vDepthFade;
    
    // Scale by depth for perspective enhancement
    float depthScale = mix(0.5, 1.5, vDepthFade);
    pos.xy *= depthScale;
    
    // Apply model-view-projection
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Point size for particle mode (fallback)
    gl_PointSize = uGlyphSize * 50.0 * depthScale * (300.0 / -mvPosition.z);
  }
`;

// ============================================================================
// FRAGMENT SHADER - Glyph Rendering with Glow
// ============================================================================
const matrixFragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform vec3 uCursorColor;
  uniform vec3 uGlintColor;
  uniform float uGlowIntensity;
  uniform sampler2D uGlyphAtlas;
  
  varying float vBrightness;
  varying float vIsCursor;
  varying float vGlyphIndex;
  varying float vDepthFade;
  varying vec2 vUv;
  varying float vGlint;
  
  // Pseudo-random for texture sampling variation
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  void main() {
    // Early discard for invisible glyphs
    if (vBrightness < 0.005) discard;
    
    // UV coordinates for glyph sampling
    vec2 uv = vUv;
    
    // Calculate glyph position in atlas (16x16 grid)
    float glyphIndex = floor(mod(vGlyphIndex, 256.0));
    float atlasX = mod(glyphIndex, 16.0) / 16.0;
    float atlasY = floor(glyphIndex / 16.0) / 16.0;
    
    // Sample from atlas with offset
    vec2 atlasUV = vec2(atlasX, atlasY) + uv / 16.0;
    
    // Create glyph shape (simulated MSDF-like rendering)
    vec2 glyphCenter = uv - 0.5;
    float glyphDist = length(glyphCenter);
    
    // Sharp glyph core
    float glyphMask = smoothstep(0.5, 0.35, glyphDist);
    
    // Soft glow halo
    float glowMask = smoothstep(0.7, 0.0, glyphDist) * uGlowIntensity;
    
    // Animated pattern within glyph (character simulation)
    float pattern = sin(uv.x * 12.0 + uv.y * 8.0 + vGlyphIndex * 0.5 + uTime * 2.0);
    pattern = pattern * 0.5 + 0.5;
    pattern = step(0.3, pattern);
    
    // Scanline effect
    float scanline = sin(gl_FragCoord.y * 1.5) * 0.15 + 0.85;
    
    // ========================================
    // COLOR CALCULATION
    // ========================================
    
    // Base color gradient (dark to bright green)
    vec3 color = mix(uSecondaryColor, uPrimaryColor, vBrightness);
    
    // Cursor gets white tint
    color = mix(color, uCursorColor, vIsCursor * 0.8);
    
    // Random glint gets bright flash
    color = mix(color, uGlintColor, vGlint);
    
    // Apply pattern and masks
    float alpha = glyphMask * pattern * vBrightness;
    alpha += glowMask * vBrightness * 0.4;
    alpha *= scanline;
    
    // Depth-based color shift (further = more saturated green)
    color = mix(color, uPrimaryColor * 0.5, (1.0 - vDepthFade) * 0.3);
    
    // Final output
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

// ============================================================================
// MATRIX RAIN COMPONENT
// ============================================================================
function MatrixRainMesh() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { numColumns, numRows, numLayers } = CONFIG;
  const instanceCount = numColumns * numRows * numLayers;
  
  // Generate instance attributes
  const instanceData = useMemo(() => {
    const positions = new Float32Array(instanceCount * 3);
    const columns = new Float32Array(instanceCount);
    const rows = new Float32Array(instanceCount);
    const layers = new Float32Array(instanceCount);
    const phases = new Float32Array(instanceCount);
    const speeds = new Float32Array(instanceCount);
    const glyphs = new Float32Array(instanceCount);
    const raindrops = new Float32Array(instanceCount);
    
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
          speeds[idx] = 0.3 + Math.random() * 0.7;
          glyphs[idx] = Math.floor(Math.random() * 256);
          raindrops[idx] = Math.floor(Math.random() * 4); // Multiple raindrops per column
          
          idx++;
        }
      }
    }
    
    return { positions, columns, rows, layers, phases, speeds, glyphs, raindrops };
  }, [instanceCount, numColumns, numRows, numLayers]);
  
  // Create glyph atlas texture
  const glyphAtlas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw glyphs
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 28px "MS Gothic", "Hiragino Kaku Gothic Pro", "Yu Gothic", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const glyphs = MATRIX_GLYPHS.replace(/\s/g, '');
    const cellSize = 32;
    
    for (let i = 0; i < Math.min(glyphs.length, 256); i++) {
      const col = i % 16;
      const row = Math.floor(i / 16);
      const x = col * cellSize + cellSize / 2;
      const y = row * cellSize + cellSize / 2;
      ctx.fillText(glyphs[i] || '?', x, y);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }, []);
  
  // Animation
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  // Create shader material
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
        uGlowIntensity: { value: CONFIG.glowIntensity },
        uPrimaryColor: { value: new THREE.Color(CONFIG.primaryColor) },
        uSecondaryColor: { value: new THREE.Color(CONFIG.secondaryColor) },
        uCursorColor: { value: new THREE.Color(CONFIG.cursorColor) },
        uGlintColor: { value: new THREE.Color(CONFIG.glintColor) },
        uGlyphAtlas: { value: glyphAtlas },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [glyphAtlas]);
  
  // Set material ref for animation
  useEffect(() => {
    materialRef.current = shaderMaterial;
  }, [shaderMaterial]);
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={instanceCount}
          array={instanceData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-instanceColumn"
          count={instanceCount}
          array={instanceData.columns}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-instanceRow"
          count={instanceCount}
          array={instanceData.rows}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-instanceLayer"
          count={instanceCount}
          array={instanceData.layers}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-instancePhase"
          count={instanceCount}
          array={instanceData.phases}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-instanceSpeed"
          count={instanceCount}
          array={instanceData.speeds}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-instanceGlyph"
          count={instanceCount}
          array={instanceData.glyphs}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-instanceRaindrop"
          count={instanceCount}
          array={instanceData.raindrops}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
}

// ============================================================================
// DEPTH FOG LAYER
// ============================================================================
function DepthFog() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, -30]}>
      <planeGeometry args={[200, 200]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x001500) },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;
          
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          void main() {
            vec2 uv = vUv;
            
            // Animated noise fog
            float n = noise(uv * 8.0 + uTime * 0.05);
            n += noise(uv * 16.0 - uTime * 0.03) * 0.5;
            n += noise(uv * 32.0 + uTime * 0.02) * 0.25;
            n /= 1.75;
            
            // Radial gradient
            vec2 center = uv - 0.5;
            float radial = 1.0 - smoothstep(0.0, 0.7, length(center));
            
            float alpha = n * radial * 0.15;
            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </mesh>
  );
}

// ============================================================================
// CAMERA ANIMATION
// ============================================================================
function CameraRig() {
  const { camera } = useThree();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Subtle floating motion
    camera.position.x = Math.sin(t * 0.1) * 3;
    camera.position.y = Math.cos(t * 0.08) * 2;
    camera.position.z = 40 + Math.sin(t * 0.05) * 5;
    
    camera.lookAt(0, 0, -20);
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
      <fog attach="fog" args={['#001100', 30, 150]} />
      
      <CameraRig />
      <DepthFog />
      <MatrixRainMesh />
      
      <EffectComposer>
        <Bloom
          intensity={CONFIG.bloomStrength}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          radius={CONFIG.bloomRadius}
          mipmapBlur
        />
        <Vignette
          offset={0.3}
          darkness={0.9}
          blendFunction={BlendFunction.NORMAL}
        />
        <Noise
          opacity={0.04}
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
          position: [0, 0, 40], 
          fov: 60, 
          near: 0.1, 
          far: 300 
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
