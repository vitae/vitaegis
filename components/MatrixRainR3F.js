// components/MatrixRainR3F.js
"use client";
import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

// Matrix characters - Japanese katakana, numbers, and symbols
const MATRIX_CHARS =
  "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789ZXCVBNMLKJHGFDSAQWERTYUIOP";

function MatrixRain() {
  const columnsRef = useRef([]);
  const instancedMeshRef = useRef();
  const timeRef = useRef(0);

  // Configuration
  const config = useMemo(() => {
    const cols = 80;
    const rows = 50;
    const fontSize = 0.3;
    const spacing = fontSize * 1.2;
    const fallSpeed = 0.05;
    const waveSpeed = 2.0;

    return {
      cols,
      rows,
      fontSize,
      spacing,
      fallSpeed,
      waveSpeed,
      totalGlyphs: cols * rows,
    };
  }, []);

  // Create glyph texture using canvas
  const glyphTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = size * MATRIX_CHARS.length;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${size * 0.8}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00ff00";

    MATRIX_CHARS.split("").forEach((char, i) => {
      ctx.fillText(char, i * size + size / 2, size / 2);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  // Initialize column data
  useEffect(() => {
    const columns = [];
    for (let i = 0; i < config.cols; i++) {
      columns.push({
        x: (i - config.cols / 2) * config.spacing,
        speed: 0.8 + Math.random() * 0.4,
        offset: Math.random() * 100,
        wavePhase: Math.random() * Math.PI * 2,
      });
    }
    columnsRef.current = columns;
  }, [config]);

  // Create instances data
  const { positions, uvOffsets, scales, colors } = useMemo(() => {
    const positions = new Float32Array(config.totalGlyphs * 3);
    const uvOffsets = new Float32Array(config.totalGlyphs);
    const scales = new Float32Array(config.totalGlyphs);
    const colors = new Float32Array(config.totalGlyphs * 3);

    let idx = 0;
    for (let col = 0; col < config.cols; col++) {
      const x = (col - config.cols / 2) * config.spacing;
      for (let row = 0; row < config.rows; row++) {
        const y = (row - config.rows / 2) * config.spacing;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = 0;

        uvOffsets[idx] = Math.floor(Math.random() * MATRIX_CHARS.length);
        scales[idx] = 1.0;

        // Default color (will be animated)
        colors[idx * 3] = 0;
        colors[idx * 3 + 1] = 1;
        colors[idx * 3 + 2] = 0;

        idx++;
      }
    }

    return { positions, uvOffsets, scales, colors };
  }, [config]);

  // Custom shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        glyphTexture: { value: glyphTexture },
        time: { value: 0 },
        glyphCount: { value: MATRIX_CHARS.length },
      },
      vertexShader: `
        attribute float uvOffset;
        attribute float scale;
        attribute vec3 color;

        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;

        uniform float time;

        void main() {
          vUv = uv;
          vColor = color;
          vAlpha = color.g; // Use green channel as alpha

          vec3 pos = position;
          pos.xy *= scale;

          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D glyphTexture;
        uniform float glyphCount;

        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          // Sample the glyph texture (will be updated per instance)
          vec2 uv = vUv;
          vec4 texColor = texture2D(glyphTexture, uv);

          // Apply color and alpha
          vec3 finalColor = vColor * texColor.g;
          float alpha = texColor.g * vAlpha;

          gl_FragColor = vec4(finalColor, alpha);

          if (alpha < 0.01) discard;
        }
      `,
    });
  }, [glyphTexture]);

  // Animation loop
  useFrame((state, delta) => {
    if (!instancedMeshRef.current) return;

    timeRef.current += delta;
    shaderMaterial.uniforms.time.value = timeRef.current;

    const mesh = instancedMeshRef.current;
    const tempMatrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();

    let idx = 0;
    for (let col = 0; col < config.cols; col++) {
      const column = columnsRef.current[col];

      // Sawtooth wave for this column
      const wavePos =
        (timeRef.current * config.waveSpeed * column.speed + column.offset) % config.rows;

      for (let row = 0; row < config.rows; row++) {
        const x = (col - config.cols / 2) * config.spacing;
        const y = (row - config.rows / 2) * config.spacing;

        // Calculate illumination based on sawtooth wave
        const distanceFromWave = row - wavePos;
        let brightness = 0;

        if (distanceFromWave < 0 && distanceFromWave > -15) {
          // Trail effect - exponential falloff
          brightness = Math.pow(Math.abs(distanceFromWave) / 15, 2);
          brightness = 1 - brightness;
        } else if (distanceFromWave >= 0 && distanceFromWave < 2) {
          // Bright cursor at the wave tip
          brightness = 2.0;
        }

        // Random flicker for ambient glyphs
        if (Math.random() > 0.998) {
          brightness = Math.max(brightness, Math.random() * 0.3);
        }

        // Apply position
        tempMatrix.setPosition(x, y, 0);
        mesh.setMatrixAt(idx, tempMatrix);

        // Apply color with brightness
        const hue = 0.33; // Green
        const saturation = 1.0;
        const lightness = brightness * 0.5;
        tempColor.setHSL(hue, saturation, lightness);
        mesh.setColorAt(idx, tempColor);

        // Randomly change character
        if (Math.random() > 0.99) {
          // This would require updating UV offsets, skipping for performance
        }

        idx++;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={instancedMeshRef}
        args={[null, shaderMaterial, config.totalGlyphs]}
      >
        <planeGeometry args={[config.fontSize, config.fontSize]} />
      </instancedMesh>
    </>
  );
}

export default function MatrixRainR3F() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        background: "#000000",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 20], fov: 75 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#000000"]} />
        <MatrixRain />

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette offset={0.3} darkness={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
