'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration,
  Vignette,
  Noise
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM SHADER MATERIAL FOR MATRIX GLYPHS WITH GLOW
// ═══════════════════════════════════════════════════════════════════════════════

const MatrixGlyphMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color('#00ff00'),
    opacity: 1.0,
    glowIntensity: 2.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying float vDepth;
    
    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader with advanced glow
  `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    uniform float glowIntensity;
    
    varying vec2 vUv;
    varying float vDepth;
    
    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);
      
      // Multi-layer glow effect
      float innerGlow = 1.0 - smoothstep(0.0, 0.3, dist);
      float outerGlow = 1.0 - smoothstep(0.0, 0.5, dist);
      float glow = pow(innerGlow, 1.5) + pow(outerGlow, 3.0) * 0.5;
      glow *= glowIntensity;
      
      // Depth-based atmospheric fade
      float depthFade = 1.0 - smoothstep(5.0, 30.0, vDepth);
      
      // Dynamic pulsing
      float pulse = 0.85 + 0.15 * sin(time * 4.0 + vDepth * 0.3);
      
      // Chromatic edge
      float edge = smoothstep(0.4, 0.5, dist);
      vec3 chromaticColor = mix(color, color * 1.3, edge);
      
      vec3 finalColor = chromaticColor * (1.0 + glow * 0.8);
      float finalOpacity = opacity * depthFade * glow * pulse;
      
      gl_FragColor = vec4(finalColor, finalOpacity);
    }
  `
);

extend({ MatrixGlyphMaterial });

// TypeScript declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      matrixGlyphMaterial: any;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED RAIN COLUMN WITH INSTANCING
// ═══════════════════════════════════════════════════════════════════════════════

interface RainColumnProps {
  position: [number, number, number];
  speed: number;
  length: number;
  delay: number;
  brightness: number;
}

function RainColumn({ position, speed, length, delay, brightness }: RainColumnProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<any>(null);
  const timeRef = useRef(delay);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const glyphData = useMemo(() => {
    return Array.from({ length }, (_, i) => ({
      flickerSpeed: 2 + Math.random() * 5,
      flickerOffset: Math.random() * Math.PI * 2,
      baseScale: 0.7 + Math.random() * 0.5,
      charChangeRate: 0.5 + Math.random() * 2,
    }));
  }, [length]);

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    timeRef.current += delta * speed;
    materialRef.current.time = state.clock.elapsedTime;

    const cyclePosition = (timeRef.current % 35) - 17;

    for (let i = 0; i < length; i++) {
      const glyph = glyphData[i];
      const y = position[1] + cyclePosition - i * 0.55;
      
      // Head glyph is brighter and larger
      const isHead = i === 0;
      const headBoost = isHead ? 1.4 : 1.0;
      
      // Subtle flicker
      const flicker = Math.sin(state.clock.elapsedTime * glyph.flickerSpeed + glyph.flickerOffset);
      const flickerScale = glyph.baseScale * (0.95 + flicker * 0.05) * headBoost;

      dummy.position.set(position[0], y, position[2]);
      dummy.scale.setScalar(flickerScale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, length]} frustumCulled={false}>
      <planeGeometry args={[0.35, 0.45]} />
      <matrixGlyphMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#00ff00"
        opacity={brightness}
        glowIntensity={2.0}
      />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATRIX RAIN SYSTEM - LAYERED FOR DEPTH
// ═══════════════════════════════════════════════════════════════════════════════

function MatrixRainSystem() {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const columns = useMemo(() => {
    const cols: RainColumnProps[] = [];
    const spacing = 0.9;
    const width = Math.min(viewport.width * 2.5, 50);
    const layers = 4;
    const count = Math.floor(width / spacing);

    for (let i = 0; i < count; i++) {
      for (let layer = 0; layer < layers; layer++) {
        const x = (i - count / 2) * spacing + (Math.random() - 0.5) * 0.4;
        const z = -layer * 6 + (Math.random() - 0.5) * 2;
        const brightness = 1.0 - layer * 0.22;

        cols.push({
          position: [x, 18, z],
          speed: 0.4 + Math.random() * 1.0 + layer * 0.15,
          length: 12 + Math.floor(Math.random() * 18),
          delay: Math.random() * 25,
          brightness: brightness * (0.8 + Math.random() * 0.2),
        });
      }
    }

    return cols;
  }, [viewport.width]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.03) * 0.02;
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.02) * 0.008;
    }
  });

  return (
    <group ref={groupRef}>
      {columns.map((col, i) => (
        <RainColumn key={i} {...col} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOLUMETRIC ENERGY ORBS
// ═══════════════════════════════════════════════════════════════════════════════

function EnergyOrbs() {
  const groupRef = useRef<THREE.Group>(null);

  const orbs = useMemo(() => {
    return Array.from({ length: 12 }, () => ({
      position: [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        -8 - Math.random() * 15,
      ] as [number, number, number],
      scale: 0.4 + Math.random() * 1.2,
      speed: 0.08 + Math.random() * 0.25,
      offset: Math.random() * Math.PI * 2,
      pulseSpeed: 0.8 + Math.random() * 1.5,
      color: Math.random() > 0.8 ? '#00ffaa' : '#00ff00',
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    groupRef.current.children.forEach((child, i) => {
      const orb = orbs[i];
      const mesh = child as THREE.Mesh;
      
      mesh.position.y = orb.position[1] + Math.sin(clock.elapsedTime * orb.speed + orb.offset) * 4;
      mesh.position.x = orb.position[0] + Math.cos(clock.elapsedTime * orb.speed * 0.6 + orb.offset) * 2.5;
      mesh.position.z = orb.position[2] + Math.sin(clock.elapsedTime * orb.speed * 0.4) * 1;
      
      const pulse = 1 + Math.sin(clock.elapsedTime * orb.pulseSpeed + orb.offset) * 0.25;
      mesh.scale.setScalar(orb.scale * pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED CYBER GRID WITH PULSE WAVES
// ═══════════════════════════════════════════════════════════════════════════════

function CyberGrid() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const gridShader = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color('#00ff00') },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        // Hex-inspired grid
        vec2 gridA = abs(fract(vPosition.xz * 0.4 - 0.5) - 0.5) / fwidth(vPosition.xz * 0.4);
        vec2 gridB = abs(fract(vPosition.xz * 0.1 - 0.5) - 0.5) / fwidth(vPosition.xz * 0.1);
        
        float lineA = min(gridA.x, gridA.y);
        float lineB = min(gridB.x, gridB.y);
        
        float gridPattern = 1.0 - min(lineA, 1.0);
        float gridPatternLarge = 1.0 - min(lineB, 1.0);
        
        // Distance fade with horizon glow
        float dist = length(vPosition.xz);
        float fade = 1.0 - smoothstep(5.0, 60.0, dist);
        float horizonGlow = smoothstep(40.0, 60.0, dist) * 0.3;
        
        // Multiple pulse waves
        float wave1 = sin(dist * 0.2 - time * 1.5) * 0.5 + 0.5;
        float wave2 = sin(dist * 0.1 - time * 2.5) * 0.5 + 0.5;
        float wave = wave1 * 0.7 + wave2 * 0.3;
        
        float alpha = (gridPattern * 0.8 + gridPatternLarge * 0.4) * fade * (0.08 + wave * 0.12) + horizonGlow;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.elapsedTime;
    }
  });

  return (
    <group position={[0, -12, -5]} rotation={[-Math.PI / 2.2, 0, 0]}>
      <mesh>
        <planeGeometry args={[150, 150, 1, 1]} />
        <shaderMaterial
          ref={materialRef}
          {...gridShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING PARTICLE DUST
// ═══════════════════════════════════════════════════════════════════════════════

function ParticleDust() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
      sizes[i] = Math.random() * 3 + 0.5;
      opacities[i] = Math.random() * 0.5 + 0.2;
    }
    
    return { positions, sizes, opacities };
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.015;
      pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.008) * 0.08;
      
      // Gentle vertical drift
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += Math.sin(clock.elapsedTime * 0.5 + i) * 0.001;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00ff00"
        size={0.04}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STREAMS - HORIZONTAL FLYING LINES
// ═══════════════════════════════════════════════════════════════════════════════

function DataStreams() {
  const groupRef = useRef<THREE.Group>(null);
  
  const streams = useMemo(() => {
    return Array.from({ length: 15 }, () => ({
      y: (Math.random() - 0.5) * 20,
      z: -5 - Math.random() * 15,
      speed: 15 + Math.random() * 25,
      length: 2 + Math.random() * 8,
      offset: Math.random() * 100,
      opacity: 0.1 + Math.random() * 0.2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    groupRef.current.children.forEach((child, i) => {
      const stream = streams[i];
      const mesh = child as THREE.Mesh;
      
      // Loop the stream across the screen
      const x = ((clock.elapsedTime * stream.speed + stream.offset) % 80) - 40;
      mesh.position.x = x;
    });
  });

  return (
    <group ref={groupRef}>
      {streams.map((stream, i) => (
        <mesh key={i} position={[-40, stream.y, stream.z]}>
          <boxGeometry args={[stream.length, 0.02, 0.02]} />
          <meshBasicMaterial
            color="#00ff00"
            transparent
            opacity={stream.opacity}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN 3D SCENE WITH POST-PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

function Scene() {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#001a00', 10, 40]} />

      <MatrixRainSystem />
      <EnergyOrbs />
      <CyberGrid />
      <ParticleDust />
      <DataStreams />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={2.0}
          luminanceThreshold={0.05}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.8}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0008, 0.0008)}
        />
        <Vignette
          offset={0.2}
          darkness={0.85}
          blendFunction={BlendFunction.NORMAL}
        />
        <Noise
          opacity={0.025}
          blendFunction={BlendFunction.OVERLAY}
        />
      </EffectComposer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MatrixBackgroundPro() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 60, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
      >
        <Scene />
      </Canvas>

      {/* CSS Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanlines */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.15) 2px, rgba(0,255,0,0.15) 4px)',
          }}
        />
        
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent" />
        
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>
    </div>
  );
}
