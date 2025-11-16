'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Simplified vertex shader - just falling characters
const vertexShader = `
  uniform float uTime;
  uniform vec2 uResolution;

  attribute float aOffset;
  attribute float aSpeed;
  attribute float aColumn;

  varying float vBrightness;

  void main() {
    // Falling position with wrap
    float y = mod(position.y + aOffset + uTime * aSpeed, uResolution.y + 10.0) - 5.0;

    // Bright head, dim tail
    float head = mod(aOffset + uTime * aSpeed, uResolution.y + 10.0);
    float dist = abs(y - head);
    vBrightness = mix(1.5, 0.2, smoothstep(0.0, 8.0, dist));

    // Column spread
    float x = (aColumn - 50.0) * (uResolution.x / 100.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
    gl_PointSize = 16.0;
  }
`;

// Simplified fragment shader - green glow
const fragmentShader = `
  uniform sampler2D uGlyphs;
  uniform float uTime;

  varying float vBrightness;

  void main() {
    // Circle shape for point
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Glyph texture sample (cycling through characters)
    vec2 uv = vec2(
      mod(gl_PointCoord.x + floor(uTime * 3.0) * 0.0625, 1.0),
      gl_PointCoord.y
    );

    // Green with brightness
    vec3 green = vec3(0.0, 1.0, 0.0);
    float alpha = (1.0 - dist * 2.0) * vBrightness;

    gl_FragColor = vec4(green * vBrightness, alpha);
  }
`;

function MatrixRain() {
  const pointsRef = useRef();
  const { viewport } = useThree();
  const [glyphTexture, setGlyphTexture] = useState(null);

  // Create simple glyph texture
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 16);
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789ZREDACTED';
    for (let i = 0; i < 16; i++) {
      ctx.fillText(chars[i % chars.length], i * 16 + 8, 8);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    setGlyphTexture(tex);
  }, []);

  // Create falling points
  const geometry = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 400 : 1000;

    const positions = new Float32Array(count * 3);
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);
    const columns = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      offsets[i] = Math.random() * 100;
      speeds[i] = 2 + Math.random() * 8;
      columns[i] = Math.random() * 100;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aColumn', new THREE.BufferAttribute(columns, 1));

    return geo;
  }, []);

  // Shader material
  const material = useMemo(() => {
    if (!glyphTexture) return null;

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
        uGlyphs: { value: glyphTexture },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [glyphTexture, viewport]);

  // Animate
  useFrame((state) => {
    if (pointsRef.current && material) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (!material) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export default function MatrixCanvas() {
  return (
    <div className="canvas-full">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance'
        }}
      >
        <MatrixRain />
      </Canvas>
    </div>
  );
}
