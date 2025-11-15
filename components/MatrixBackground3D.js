'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import MatrixRain from './MatrixRain';
import * as THREE from 'three';

// Matrix-style grid floor
function MatrixGrid() {
  const gridRef = useRef();

  return (
    <gridHelper
      ref={gridRef}
      args={[100, 100, '#003300', '#001100']}
      position={[0, -8, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// Ambient Matrix environment
function MatrixEnvironment() {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.1} color="#003300" />

      {/* Directional light for depth */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.3}
        color="#00ff41"
      />

      {/* Point lights for dramatic effect */}
      <pointLight position={[0, 5, -10]} intensity={0.5} color="#00ff41" />
      <pointLight position={[-10, 0, 0]} intensity={0.3} color="#003300" />

      {/* Fog for depth */}
      <fog attach="fog" args={['#000000', 10, 50]} />
    </>
  );
}

// Camera controller for subtle movement
function CameraRig() {
  useRef();

  return null;
}

export default function MatrixBackground3D() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 10],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#000000']} />

        <Suspense fallback={null}>
          <MatrixEnvironment />
          <MatrixGrid />
          <MatrixRain count={5000} />
          <CameraRig />

          {/* Post-processing effects */}
          <EffectComposer>
            <Bloom
              intensity={1.5}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              blendFunction={BlendFunction.SCREEN}
            />
            <ChromaticAberration
              offset={[0.0005, 0.0005]}
              blendFunction={BlendFunction.NORMAL}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
