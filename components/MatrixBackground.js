// components/MatrixRainBackground.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const MatrixRainBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current?.appendChild(renderer.domElement);

    // --- Matrix rain setup ---
    const matrixChars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const columns = 80;
    const drops = [];

    const createTextSprite = (text, opacity = 1, isLeading = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');

      context.font = 'bold 48px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = isLeading ? '#40ff40' : '#00ff00';
      context.globalAlpha = opacity;

      if (isLeading) {
        context.shadowBlur = 20;
        context.shadowColor = '#00ff00';
      }

      context.fillText(text, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(1, 1, 1);

      return sprite;
    };

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      const drop = {
        x: (i - columns / 2) * 0.8,
        y: Math.random() * -50,
        speed: 0.08 + Math.random() * 0.12,
        chars: [],
        charData: []
      };

      for (let j = 0; j < 20; j++) {
        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        const opacity = Math.max(0, 1 - j * 0.05);
        const sprite = createTextSprite(char, opacity, j === 0);
        sprite.position.set(drop.x, drop.y - j * 1.2, 0);
        scene.add(sprite);
        drop.chars.push(sprite);
        drop.charData.push({ char, opacity });
      }

      drops.push(drop);
    }

    const animate = () => {
      requestAnimationFrame(animate);

      drops.forEach(drop => {
        drop.y += drop.speed;

        if (drop.y > 40) {
          drop.y = -20;
          drop.speed = 0.08 + Math.random() * 0.12;
          drop.charData.forEach(data => {
            data.char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          });
        }

        drop.chars.forEach((sprite, j) => {
          sprite.position.y = drop.y - j * 1.2;

          if (Math.random() < 0.005) {
            const newChar = matrixChars[Math.floor(Math.random() * matrixChars.length)];
            const opacity = Math.max(0, 1 - j * 0.05);
            const newSprite = createTextSprite(newChar, opacity, j === 0);
            newSprite.position.copy(sprite.position);
            scene.remove(sprite);
            scene.add(newSprite);
            drop.chars[j] = newSprite;
            drop.charData[j].char = newChar;
          }

          const fadeStart = 20;
          if (sprite.position.y > fadeStart) {
            const fadeFactor = 1 - (sprite.position.y - fadeStart) / 20;
            sprite.material.opacity = drop.charData[j].opacity * fadeFactor;
          }
        });
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      drops.forEach(drop => drop.chars.forEach(sprite => {
        sprite.material.map?.dispose();
        sprite.material.dispose();
        scene.remove(sprite);
