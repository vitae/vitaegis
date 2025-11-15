'use client';

import { useEffect, useRef } from 'react';

export default function MatrixBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to full window
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    // Matrix characters - Japanese katakana, Latin letters, and numbers
    const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const chars = matrixChars.split('');

    const fontSize = 16;
    const columns = canvas.width / fontSize;

    // Array to track y-position of each column
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Start at random heights
    }

    // Draw function
    function draw() {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Matrix green text
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character from the set
        const char = chars[Math.floor(Math.random() * chars.length)];

        // Calculate x position
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Create gradient effect - brighter at the front
        const isLeader = Math.random() > 0.975;
        if (isLeader) {
          // Bright white/green for leader character
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ff41';
        } else {
          // Regular Matrix green
          ctx.fillStyle = '#00ff41';
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#00ff41';
        }

        // Draw the character
        ctx.fillText(char, x, y);

        // Reset drop to top with random delay
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Increment y position
        drops[i]++;
      }

      // Reset shadow
      ctx.shadowBlur = 0;
    }

    // Animation
    const interval = setInterval(draw, 33); // ~30fps for authentic look

    // Handle window resize
    const handleResize = () => {
      setCanvasSize();
      // Recalculate columns
      const newColumns = canvas.width / fontSize;
      drops.length = newColumns;
      for (let i = 0; i < newColumns; i++) {
        if (drops[i] === undefined) {
          drops[i] = Math.random() * -100;
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        background: '#000000',
      }}
    />
  );
}
