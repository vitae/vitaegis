'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Matrix characters - Katakana + numbers
const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
const CHAR_ARRAY = CHARS.split('');

// Configuration
const CONFIG = {
  speed: 3,
  fadeRate: 0.0027,
  spawnDelayMin: 5,
  spawnDelayMax: 15,
  columnSpacing: 1.0,
  depthLayers: 5,
  depthRange: 15,
};

// Texture cache for character textures
const textureCache = new Map<string, THREE.CanvasTexture>();

function createCharTexture(char: string): THREE.CanvasTexture {
  if (textureCache.has(char)) {
    return textureCache.get(char)!;
  }

  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Draw character
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(char, texture);

  return texture;
}

function getRandomChar(): string {
  return CHAR_ARRAY[Math.floor(Math.random() * CHAR_ARRAY.length)];
}

interface Glyph {
  mesh: THREE.Mesh;
  char: string;
  speed: number;
  brightness: number;
  age: number;
  mutationTimer: number;
}

interface Stream {
  x: number;
  z: number;
  glyphs: Glyph[];
  nextSpawn: number;
}

export default function MatrixBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const streamsRef = useRef<Stream[]>([]);
  const frameIdRef = useRef<number>(0);
  const glyphGeometryRef = useRef<THREE.PlaneGeometry | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.04);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Shared geometry for all glyphs
    const glyphGeometry = new THREE.PlaneGeometry(0.5, 0.6);
    glyphGeometryRef.current = glyphGeometry;

    // Calculate view dimensions
    const vFov = (camera.fov * Math.PI) / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
    const viewWidth = viewHeight * camera.aspect;

    // Initialize streams
    const streams: Stream[] = [];
    const cols = Math.ceil(viewWidth / CONFIG.columnSpacing) + 5;

    for (let c = 0; c < cols; c++) {
      for (let d = 0; d < CONFIG.depthLayers; d++) {
        streams.push({
          x: c * CONFIG.columnSpacing - viewWidth / 2,
          z: -d * (CONFIG.depthRange / CONFIG.depthLayers),
          glyphs: [],
          nextSpawn: Math.random() * CONFIG.spawnDelayMax,
        });
      }
    }
    streamsRef.current = streams;

    // Create glyph function
    const createGlyph = (x: number, y: number, z: number): { mesh: THREE.Mesh; char: string } => {
      const char = getRandomChar();
      const texture = createCharTexture(char);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: new THREE.Color(0.8, 1.0, 0.8),
      });

      const mesh = new THREE.Mesh(glyphGeometry, material);
      mesh.position.set(x, y, z);

      return { mesh, char };
    };

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      const vFov = (camera.fov * Math.PI) / 180;
      const viewHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
      const halfHeight = viewHeight / 2;

      streams.forEach((stream) => {
        // Spawn new glyph
        stream.nextSpawn--;
        if (stream.nextSpawn <= 0 && stream.glyphs.length < 60) {
          const { mesh, char } = createGlyph(stream.x, halfHeight + 1, stream.z);
          scene.add(mesh);

          stream.glyphs.push({
            mesh,
            char,
            speed: (0.5 + Math.random() * 0.5) * CONFIG.speed * 0.02,
            brightness: 1,
            age: 0,
            mutationTimer: Math.random() * 30,
          });

          stream.nextSpawn =
            CONFIG.spawnDelayMin +
            Math.random() * (CONFIG.spawnDelayMax - CONFIG.spawnDelayMin);
        }

        // Update glyphs
        for (let i = stream.glyphs.length - 1; i >= 0; i--) {
          const g = stream.glyphs[i];

          // Move down
          g.mesh.position.y -= g.speed;
          g.age++;
          g.brightness -= CONFIG.fadeRate;

          // Update color based on age
          const material = g.mesh.material as THREE.MeshBasicMaterial;
          if (g.age < 3) {
            // Lead - white-green (brightest)
            material.color.setRGB(0.8, 1.0, 0.8);
          } else if (g.age < 10) {
            // Bright green
            material.color.setRGB(0, 1.0, 0.255);
          } else {
            // Fading green
            material.color.setRGB(0, 0.7, 0.08);
          }
          material.opacity = Math.max(0, g.brightness);

          // Random character mutation
          g.mutationTimer--;
          if (g.mutationTimer <= 0) {
            const newChar = getRandomChar();
            material.map = createCharTexture(newChar);
            material.needsUpdate = true;
            g.char = newChar;
            g.mutationTimer = 10 + Math.random() * 30;
          }

          // Remove if off screen or faded
          if (g.mesh.position.y < -halfHeight - 1 || g.brightness <= 0) {
            scene.remove(g.mesh);
            material.dispose();
            stream.glyphs.splice(i, 1);
          }
        }
      });

      // Subtle camera sway
      camera.position.x = Math.sin(Date.now() * 0.0003) * 0.5;
      camera.position.y = Math.cos(Date.now() * 0.0004) * 0.3;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);

      // Dispose all glyphs
      streams.forEach((stream) => {
        stream.glyphs.forEach((g) => {
          scene.remove(g.mesh);
          (g.mesh.material as THREE.MeshBasicMaterial).dispose();
        });
      });

      // Dispose geometry
      glyphGeometry.dispose();

      // Dispose renderer
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      {/* Three.js container - z-0 so it's behind content (z-10) but visible */}
      <div ref={containerRef} className="fixed inset-0 z-0" />
      
      {/* Scanlines overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
          opacity: 0.3,
        }}
      />
    </>
  );
}
