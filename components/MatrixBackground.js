// components/MatrixBackground.js
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

export default function MatrixBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera with perspective for depth
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 15;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // VITAEGIS characters - authentic set
    const matrixChars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:・.\"=*+-<>¦|_".split('');

    // Create character texture atlas
    const fontSize = 32;
    const charsPerRow = 16;
    const atlasSize = Math.ceil(Math.sqrt(matrixChars.length)) * charsPerRow;
    const charCanvas = document.createElement('canvas');
    charCanvas.width = atlasSize;
    charCanvas.height = atlasSize;
    const charCtx = charCanvas.getContext('2d');
    charCtx.fillStyle = '#000000';
    charCtx.fillRect(0, 0, atlasSize, atlasSize);
    charCtx.font = `${fontSize}px monospace`;
    charCtx.textAlign = 'center';
    charCtx.textBaseline = 'middle';
    charCtx.fillStyle = '#ffffff';

    // Draw all characters to atlas
    matrixChars.forEach((char, index) => {
      const col = index % charsPerRow;
      const row = Math.floor(index / charsPerRow);
      const x = col * fontSize + fontSize / 2;
      const y = row * fontSize + fontSize / 2;
      charCtx.fillText(char, x, y);
    });

    const charTexture = new THREE.CanvasTexture(charCanvas);
    charTexture.minFilter = THREE.NearestFilter;
    charTexture.magFilter = THREE.NearestFilter;

    // Grid configuration
    const cols = 80;
    const rows = 40;
    const columnWidth = 30 / cols;
    const rowHeight = 20 / rows;

    // Rain stream configuration for each column
    class RainStream {
      constructor(col) {
        this.col = col;
        this.reset();
      }

      reset() {
        this.headRow = -Math.random() * rows;
        this.speed = 0.1 + Math.random() * 0.15;
        this.length = 10 + Math.random() * 15;
        this.depth = Math.random();
      }

      update() {
        this.headRow += this.speed;
        if (this.headRow - this.length > rows) {
          this.reset();
        }
      }

      getBrightness(row) {
        const distanceFromHead = this.headRow - row;

        if (distanceFromHead < 0) return 0;
        if (distanceFromHead > this.length) return 0;

        // Head is brightest (white-green)
        if (distanceFromHead < 1) {
          return 1.0;
        }

        // Exponential fade for the tail
        const fade = 1 - (distanceFromHead / this.length);
        return Math.pow(fade, 2.5) * 0.7;
      }
    }

    // Create rain streams
    const streams = [];
    for (let col = 0; col < cols; col++) {
      streams.push(new RainStream(col));
    }

    // Create character grid data
    const characters = [];
    for (let row = 0; row < rows; row++) {
      characters[row] = [];
      for (let col = 0; col < cols; col++) {
        characters[row][col] = {
          charIndex: Math.floor(Math.random() * matrixChars.length),
          changeTimer: Math.random() * 100
        };
      }
    }

    // Custom shader material for glowing characters with texture atlas
    const vertexShader = `
      varying vec2 vUv;
      varying float vBrightness;
      attribute float brightness;
      attribute vec3 offset;
      attribute float charIndex;
      varying float vCharIndex;

      void main() {
        vUv = uv;
        vBrightness = brightness;
        vCharIndex = charIndex;
        vec3 transformed = position + offset;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D charTexture;
      uniform float charsPerRow;
      uniform float totalChars;
      varying vec2 vUv;
      varying float vBrightness;
      varying float vCharIndex;

      void main() {
        // Calculate UV coordinates for the specific character in the atlas
        float col = mod(vCharIndex, charsPerRow);
        float row = floor(vCharIndex / charsPerRow);
        float cellSize = 1.0 / charsPerRow;

        vec2 atlasUV = vec2(
          (col + vUv.x) * cellSize,
          (row + vUv.y) * cellSize
        );

        vec4 texColor = texture2D(charTexture, atlasUV);

        // VITAEGIS green color with brightness variation
        vec3 glowColor = vec3(0.0, 1.0, 0.0);

        // Head of stream is white-green, tail is darker green
        if (vBrightness > 0.85) {
          float headFactor = (vBrightness - 0.85) / 0.15;
          glowColor = mix(vec3(0.0, 1.0, 0.0), vec3(0.9, 1.0, 0.9), headFactor);
        }

        float alpha = texColor.r * vBrightness;
        if (alpha < 0.01) discard;

        gl_FragColor = vec4(glowColor * alpha, alpha);
      }
    `;

    // Create instanced geometry for all characters
    const planeGeometry = new THREE.PlaneGeometry(columnWidth * 0.95, rowHeight * 0.95);
    const instancedGeometry = new THREE.InstancedBufferGeometry();
    instancedGeometry.index = planeGeometry.index;
    instancedGeometry.attributes.position = planeGeometry.attributes.position;
    instancedGeometry.attributes.uv = planeGeometry.attributes.uv;

    const count = cols * rows;
    const offsets = new Float32Array(count * 3);
    const brightnesses = new Float32Array(count);
    const charIndices = new Float32Array(count);

    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col - cols / 2) * columnWidth;
        const y = (rows / 2 - row) * rowHeight;
        const z = 0;

        offsets[idx * 3] = x;
        offsets[idx * 3 + 1] = y;
        offsets[idx * 3 + 2] = z;
        brightnesses[idx] = 0;
        charIndices[idx] = characters[row][col].charIndex;
        idx++;
      }
    }

    instancedGeometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3));
    instancedGeometry.setAttribute('brightness', new THREE.InstancedBufferAttribute(brightnesses, 1));
    instancedGeometry.setAttribute('charIndex', new THREE.InstancedBufferAttribute(charIndices, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        charTexture: { value: charTexture },
        charsPerRow: { value: charsPerRow },
        totalChars: { value: matrixChars.length }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(instancedGeometry, material);
    scene.add(mesh);

    // Post-processing for bloom effect
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      2.0,  // strength
      0.6,  // radius
      0.1   // threshold
    );
    composer.addPass(bloomPass);

    // Animation
    let frameCount = 0;
    function animate() {
      requestAnimationFrame(animate);
      frameCount++;

      // Update streams
      streams.forEach(stream => stream.update());

      // Update brightness and character values
      const brightnessAttr = instancedGeometry.attributes.brightness;
      const charIndexAttr = instancedGeometry.attributes.charIndex;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const stream = streams[col];

          // Get brightness from stream
          let brightness = stream.getBrightness(row);

          // Randomly change characters occasionally when visible
          if (brightness > 0.1) {
            characters[row][col].changeTimer--;
            if (characters[row][col].changeTimer <= 0) {
              characters[row][col].charIndex = Math.floor(Math.random() * matrixChars.length);
              charIndexAttr.array[idx] = characters[row][col].charIndex;
              characters[row][col].changeTimer = 10 + Math.random() * 50;
            }
          }

          brightnessAttr.array[idx] = brightness;
        }
      }

      brightnessAttr.needsUpdate = true;
      charIndexAttr.needsUpdate = true;

      // Subtle camera movement for depth
      camera.position.x = Math.sin(frameCount * 0.0005) * 2;
      camera.position.y = Math.cos(frameCount * 0.0003) * 1;
      camera.lookAt(0, 0, 0);

      composer.render();
    }
    animate();

    // Handle resize
    function handleResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      composer.setSize(mount.clientWidth, mount.clientHeight);
      bloomPass.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      composer.dispose();
      instancedGeometry.dispose();
      material.dispose();
      charTexture.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        zIndex: -1,
      }}
    />
  );
}
