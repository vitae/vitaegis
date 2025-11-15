"use client";
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・."=*+-<>¦|_';

function Matrix3D() {
  const groupRef = useRef();
  const timeRef = useRef(0);

  // 3D grid configuration
  const cols = 60;
  const rows = 40;
  const layers = 30; // Depth layers

  // Create character texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 2048, 2048);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 60px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    CHARS.split('').forEach((char, i) => {
      const x = (i % 32) * 64 + 32;
      const y = Math.floor(i / 32) * 64 + 32;
      ctx.fillText(char, x, y);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, []);

  // Create 3D geometry and material
  const [geometry, material] = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.5, 0.7);
    const instGeo = new THREE.InstancedBufferGeometry();

    instGeo.index = geo.index;
    instGeo.attributes.position = geo.attributes.position;
    instGeo.attributes.uv = geo.attributes.uv;

    const count = cols * rows * layers;
    const offsets = new Float32Array(count * 3);
    const chars = new Float32Array(count);
    const columnIds = new Float32Array(count);
    const rowIds = new Float32Array(count);
    const depthIds = new Float32Array(count);

    let idx = 0;
    for (let z = 0; z < layers; z++) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Position in 3D space
          offsets[idx * 3] = (x - cols / 2) * 0.6;
          offsets[idx * 3 + 1] = (rows / 2 - y) * 0.8;
          offsets[idx * 3 + 2] = -z * 2; // Depth spacing

          chars[idx] = Math.floor(Math.random() * CHARS.length);
          columnIds[idx] = x;
          rowIds[idx] = y;
          depthIds[idx] = z;
          idx++;
        }
      }
    }

    instGeo.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    instGeo.setAttribute('charIdx', new THREE.InstancedBufferAttribute(chars, 1));
    instGeo.setAttribute('colId', new THREE.InstancedBufferAttribute(columnIds, 1));
    instGeo.setAttribute('rowId', new THREE.InstancedBufferAttribute(rowIds, 1));
    instGeo.setAttribute('depthId', new THREE.InstancedBufferAttribute(depthIds, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTex: { value: texture },
        uCameraZ: { value: 0 },
      },
      vertexShader: `
        attribute vec3 offset;
        attribute float charIdx;
        attribute float colId;
        attribute float rowId;
        attribute float depthId;

        varying vec2 vUv;
        varying float vChar;
        varying float vBright;
        varying float vDepth;

        uniform float uTime;
        uniform float uCameraZ;

        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float rand(vec3 co) {
          return fract(sin(dot(co, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }

        void main() {
          vUv = uv;
          vChar = charIdx;

          // Each column + depth layer gets unique timing
          float colRand = rand(vec3(colId, depthId, 0.0));
          float timeOffset = colRand * 150.0;
          float speed = 0.1 + colRand * 0.08;

          // Calculate rain position
          float t = uTime * speed + timeOffset;
          float rainPos = mod(t * 40.0, 80.0);
          float dist = rainPos - rowId;

          // Create rain effect
          if (dist > 0.0 && dist < 30.0) {
            vBright = 1.0 - (dist / 30.0);
            vBright = pow(vBright, 1.5);
          } else {
            vBright = 0.0;
          }

          // Depth-based fade
          float depthFade = 1.0 - (depthId / 30.0);
          depthFade = pow(depthFade, 0.8);
          vBright *= depthFade;

          vDepth = depthId;

          // Billboard effect - face camera
          vec4 mvPosition = modelViewMatrix * vec4(offset, 1.0);
          mvPosition.xy += position.xy;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;

        varying vec2 vUv;
        varying float vChar;
        varying float vBright;
        varying float vDepth;

        void main() {
          if (vBright < 0.01) discard;

          // Sample character
          float col = mod(vChar, 32.0);
          float row = floor(vChar / 32.0);
          vec2 uv = vec2(
            (col + vUv.x) / 32.0,
            (row + vUv.y) / 32.0
          );

          float texAlpha = texture2D(uTex, uv).r;

          // Color gradient based on depth
          vec3 nearGreen = vec3(0.2, 1.0, 0.3);
          vec3 farGreen = vec3(0.0, 0.6, 0.2);
          vec3 white = vec3(1.0);

          // Mix based on depth
          float depthMix = vDepth / 30.0;
          vec3 green = mix(nearGreen, farGreen, depthMix);

          // Bright head
          vec3 color = mix(green, white, pow(vBright, 0.3));

          float alpha = texAlpha * vBright;
          gl_FragColor = vec4(color * alpha, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return [instGeo, mat];
  }, [texture]);

  // Animation
  useFrame((state, delta) => {
    timeRef.current += delta;

    if (material) {
      material.uniforms.uTime.value = timeRef.current;
      material.uniforms.uCameraZ.value = state.camera.position.z;
    }

    // Rotate camera around the matrix
    if (groupRef.current) {
      const time = timeRef.current * 0.05;
      state.camera.position.x = Math.sin(time) * 15;
      state.camera.position.z = Math.cos(time) * 15 + 30;
      state.camera.position.y = Math.sin(time * 0.5) * 3;
      state.camera.lookAt(0, 0, 0);
    }

    // Randomly cycle characters
    if (Math.random() < 0.05) {
      const attr = geometry.getAttribute('charIdx');
      const idx = Math.floor(Math.random() * cols * rows * layers);
      attr.array[idx] = Math.floor(Math.random() * CHARS.length);
      attr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh args={[geometry, material, cols * rows * layers]} />
      <fog attach="fog" args={['#000', 20, 80]} />
    </group>
  );
}

export default function MatrixBackground() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#000',
    }}>
      <Canvas
        camera={{ position: [0, 0, 40], fov: 75, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ display: 'block' }}
      >
        <color attach="background" args={['#000000']} />
        <Matrix3D />
        <EffectComposer>
          <Bloom
            intensity={3.5}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.9}
            radius={1.0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
