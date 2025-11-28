'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Matrix character set (Katakana + numbers + symbols)
const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

interface RainColumnProps {
  position: [number, number, number];
  speed: number;
  length: number;
  delay: number;
}

function RainColumn({ position, speed, length, delay }: RainColumnProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(delay);

  const { chars, matrices, opacities } = useMemo(() => {
    const chars: string[] = [];
    const matrices: THREE.Matrix4[] = [];
    const opacities: number[] = [];

    for (let i = 0; i < length; i++) {
      chars.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
      const matrix = new THREE.Matrix4();
      matrix.setPosition(0, -i * 0.5, 0);
      matrices.push(matrix);
      opacities.push(1 - i / length);
    }

    return { chars, matrices, opacities };
  }, [length]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    timeRef.current += delta * speed;

    const yOffset = (timeRef.current % 20) - 10;

    for (let i = 0; i < length; i++) {
      const matrix = new THREE.Matrix4();
      const y = position[1] + yOffset - i * 0.5;
      matrix.setPosition(position[0], y, position[2]);

      // Fade based on position
      const normalizedY = (y + 10) / 20;
      const fade = Math.max(0, Math.min(1, normalizedY)) * opacities[i];

      meshRef.current.setMatrixAt(i, matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, length]}>
      <planeGeometry args={[0.3, 0.4]} />
      <meshBasicMaterial color="#00ff41" transparent opacity={0.8} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function MatrixRain() {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const columns = useMemo(() => {
    const cols: RainColumnProps[] = [];
    const spacing = 0.8;
    const width = Math.min(viewport.width * 1.5, 30);
    const count = Math.floor(width / spacing);

    for (let i = 0; i < count; i++) {
      const x = (i - count / 2) * spacing + (Math.random() - 0.5) * 0.3;
      const z = (Math.random() - 0.5) * 5;
      cols.push({
        position: [x, 10, z],
        speed: 0.5 + Math.random() * 1.5,
        length: 8 + Math.floor(Math.random() * 12),
        delay: Math.random() * 10,
      });
    }

    return cols;
  }, [viewport.width]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(Date.now() * 0.0001) * 0.05;
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

function GlowOrbs() {
  const orbsRef = useRef<THREE.Group>(null);

  const orbs = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10,
        -5 - Math.random() * 5,
      ] as [number, number, number],
      scale: 0.5 + Math.random() * 1,
      speed: 0.2 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!orbsRef.current) return;

    orbsRef.current.children.forEach((child, i) => {
      const orb = orbs[i];
      child.position.y = orb.position[1] + Math.sin(clock.elapsedTime * orb.speed + orb.offset) * 2;
      child.position.x = orb.position[0] + Math.cos(clock.elapsedTime * orb.speed * 0.5 + orb.offset) * 1;
    });
  });

  return (
    <group ref={orbsRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position}>
          <sphereGeometry args={[orb.scale, 16, 16]} />
          <meshBasicMaterial color="#00ff41" transparent opacity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function GridFloor() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame(({ clock }) => {
    if (gridRef.current) {
      gridRef.current.position.z = (clock.elapsedTime * 0.5) % 2;
    }
  });

  return (
    <group position={[0, -8, 0]} rotation={[0, 0, 0]}>
      <gridHelper
        ref={gridRef}
        args={[100, 50, '#003311', '#001a09']}
        rotation={[0, 0, 0]}
      />
      {/* Grid glow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#001a09" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 5, 25]} />

      {/* Ambient atmosphere */}
      <ambientLight intensity={0.1} />

      {/* Matrix Rain */}
      <MatrixRain />

      {/* Floating glow orbs */}
      <GlowOrbs />

      {/* Cyber grid floor */}
      <GridFloor />
    </>
  );
}

export default function MatrixBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <Scene />
      </Canvas>

      {/* Overlay gradients for depth */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black via-black/80 to-transparent" />

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.8)_100%)]" />

        {/* Scanlines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.1) 2px, rgba(0,255,65,0.1) 4px)',
          }}
        />
      </div>
    </div>
  );
}
