'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Custom shader for Matrix rain effect with GPU optimization
const matrixVertexShader = `
  attribute float speed;
  attribute float offset;
  attribute float size;
  attribute float brightness;

  varying float vBrightness;
  varying vec2 vUv;

  uniform float time;

  void main() {
    vBrightness = brightness;
    vUv = uv;

    vec3 pos = position;

    // Animate Y position based on time, speed, and offset
    pos.y = mod(position.y - time * speed + offset, 20.0) - 10.0;

    // Add slight wobble for organic feel
    pos.x += sin(time * 0.5 + offset) * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const matrixFragmentShader = `
  varying float vBrightness;
  varying vec2 vUv;

  uniform sampler2D glyphTexture;
  uniform vec3 color1;
  uniform vec3 color2;

  void main() {
    // Create circular point
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    // Gradient from bright to dark
    vec3 color = mix(color1, color2, vBrightness);

    // Soft glow effect
    float alpha = smoothstep(0.5, 0.0, dist) * vBrightness;

    gl_FragColor = vec4(color, alpha);
  }
`;

export default function MatrixRain({ count = 5000 }) {
  const pointsRef = useRef();
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      glyphTexture: { value: null },
      color1: { value: new THREE.Color('#00ff41') }, // Bright Matrix green
      color2: { value: new THREE.Color('#003B00') }, // Dark green
    }),
    []
  );

  // Generate particle attributes
  const particleAttributes = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    const sizes = new Float32Array(count);
    const brightnesses = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute across view
      positions[i * 3] = (Math.random() - 0.5) * viewport.width * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

      // Varying speeds for depth
      speeds[i] = 0.5 + Math.random() * 2;

      // Random offsets for staggered animation
      offsets[i] = Math.random() * 20;

      // Varying sizes
      sizes[i] = 2 + Math.random() * 8;

      // Brightness variation - some particles brighter than others
      brightnesses[i] = 0.3 + Math.random() * 0.7;
    }

    return { positions, speeds, offsets, sizes, brightnesses };
  }, [count, viewport]);

  // Animation loop
  useFrame((state) => {
    if (pointsRef.current) {
      uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particleAttributes.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-speed"
          count={count}
          array={particleAttributes.speeds}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-offset"
          count={count}
          array={particleAttributes.offsets}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particleAttributes.sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-brightness"
          count={count}
          array={particleAttributes.brightnesses}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={matrixVertexShader}
        fragmentShader={matrixFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
