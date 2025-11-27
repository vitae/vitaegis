import { useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// VITAEGIS MATRIX RAIN - Canvas2D Preview Version
// Inspired by Rezmason's Matrix (github.com/Rezmason/matrix)
// ═══════════════════════════════════════════════════════════════════════════════

// Matrix-style glyphs (katakana + symbols)
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>◊◆◇○●□■△▽∞∑∏√∫≈≠≤≥';

// Hash function for deterministic randomness
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
};

// Sawtooth wave - core of Rezmason's raindrop illumination
const sawtooth = (x, period) => {
  return ((x % period) + period) % period / period;
};

export default function MatrixRainPreview() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const columnsRef = useRef([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Configuration
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const rows = Math.floor(height / fontSize);
    
    // Initialize column data with multiple streams per column
    if (columnsRef.current.length !== columns) {
      columnsRef.current = [];
      for (let i = 0; i < columns; i++) {
        // Each column has multiple raindrop streams (Rezmason's non-colliding drops)
        const streams = [];
        const numStreams = 2 + Math.floor(hash(i, 0) * 2);
        
        for (let s = 0; s < numStreams; s++) {
          streams.push({
            speed: 0.3 + hash(i, s * 100) * 0.7,
            length: 8 + hash(i, s * 200) * 12,
            phase: hash(i, s * 300) * 100,
            period: 15 + hash(i, s * 400) * 20,
          });
        }
        
        columnsRef.current.push({
          streams,
          glyphs: Array(rows).fill(0).map((_, r) => ({
            char: GLYPHS[Math.floor(hash(i, r) * GLYPHS.length)],
            cycleOffset: hash(i * 100, r * 100) * 100,
            cycleSpeed: 0.2 + hash(i * 200, r * 200) * 0.3,
          })),
        });
      }
    }

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      
      // Clear with slight trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw each column
      for (let col = 0; col < columns; col++) {
        const columnData = columnsRef.current[col];
        const x = col * fontSize;
        
        for (let row = 0; row < rows; row++) {
          const y = (row + 1) * fontSize;
          const glyphData = columnData.glyphs[row];
          
          // Calculate brightness from all streams (Rezmason's sawtooth method)
          let brightness = 0;
          let isCursor = false;
          
          for (const stream of columnData.streams) {
            const sawPos = sawtooth(
              row + elapsed * stream.speed * 10 + stream.phase,
              stream.period
            );
            
            const dropEnd = stream.length / stream.period;
            
            if (sawPos < dropEnd) {
              // Within the raindrop trail
              const normalized = sawPos / dropEnd;
              const trailBrightness = Math.exp(-normalized * 4); // Exponential falloff
              brightness = Math.max(brightness, trailBrightness);
              
              // Cursor at the very tip
              if (sawPos < 0.03) {
                isCursor = true;
              }
            }
          }
          
          if (brightness > 0.01) {
            // Cycle glyphs based on brightness (Rezmason observation)
            const cycleTime = elapsed * glyphData.cycleSpeed * (0.3 + brightness * 0.7) + glyphData.cycleOffset;
            const glyphIndex = Math.floor(cycleTime) % GLYPHS.length;
            const char = GLYPHS[glyphIndex];
            
            // Color calculation
            let r, g, b;
            if (isCursor) {
              // White cursor tip
              r = 255;
              g = 255;
              b = 255;
            } else {
              // Green trail with brightness falloff
              r = Math.floor(brightness * 30);
              g = Math.floor(50 + brightness * 205);
              b = Math.floor(brightness * 80);
            }
            
            // Apply brightness
            const alpha = Math.min(1, brightness * 1.5);
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.font = `bold ${fontSize}px "MS Gothic", "Yu Gothic", monospace`;
            ctx.fillText(char, x, y);
            
            // Glow effect for bright characters
            if (brightness > 0.5) {
              ctx.shadowColor = '#00ff41';
              ctx.shadowBlur = brightness * 15;
              ctx.fillText(char, x, y);
              ctx.shadowBlur = 0;
            }
          }
        }
      }
      
      // Scanline effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      for (let i = 0; i < height; i += 4) {
        ctx.fillRect(0, i, width, 2);
      }
      
      // Vignette
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, height * 0.8
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions]);

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Matrix Rain Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      
      {/* Content Overlay */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '2rem',
      }}>
        {/* Logo */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          fontWeight: 300,
          letterSpacing: '0.3em',
          marginBottom: '0.5rem',
          textShadow: '0 0 40px #00ff41, 0 0 80px rgba(0, 255, 65, 0.5), 0 0 120px rgba(0, 255, 65, 0.25)',
        }}>
          <span style={{ color: '#00ff41' }}>VITAE</span>
          <span style={{ color: '#fff' }}>GIS</span>
        </h1>
        
        {/* Tagline */}
        <p style={{
          fontSize: '0.75rem',
          letterSpacing: '0.5em',
          color: 'rgba(0, 255, 65, 0.7)',
          textTransform: 'uppercase',
          marginBottom: '2rem',
        }}>
          Health • Stealth • Wealth
        </p>
        
        {/* Description */}
        <p style={{
          fontSize: '1rem',
          color: 'rgba(255, 255, 255, 0.6)',
          maxWidth: '500px',
          margin: '0 auto 2rem',
          lineHeight: 1.6,
        }}>
          Ancient wisdom digitized for the modern seeker.
          <br />
          <span style={{ color: 'rgba(0, 255, 65, 0.8)' }}>
            Zen • Kundalini • Tai Chi • Qi Gong
          </span>
        </p>
        
        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button style={{
            padding: '1rem 2rem',
            background: 'transparent',
            border: '1px solid #00ff41',
            color: '#00ff41',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontFamily: 'inherit',
          }}
          onMouseOver={(e) => {
            e.target.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.5), inset 0 0 20px rgba(0, 255, 65, 0.1)';
            e.target.style.background = 'rgba(0, 255, 65, 0.1)';
          }}
          onMouseOut={(e) => {
            e.target.style.boxShadow = 'none';
            e.target.style.background = 'transparent';
          }}>
            Enter the Dojo
          </button>
          
          <button style={{
            padding: '1rem 2rem',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontFamily: 'inherit',
          }}
          onMouseOver={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            e.target.style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.target.style.color = 'rgba(255, 255, 255, 0.7)';
          }}>
            Connect Wallet
          </button>
        </div>
      </div>
      
      {/* Corner Decorations */}
      <svg style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, color: 'rgba(0, 255, 65, 0.3)' }} viewBox="0 0 40 40">
        <path d="M0 20 L0 0 L20 0" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, color: 'rgba(0, 255, 65, 0.3)' }} viewBox="0 0 40 40">
        <path d="M40 20 L40 0 L20 0" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg style={{ position: 'absolute', bottom: 16, left: 16, width: 40, height: 40, color: 'rgba(0, 255, 65, 0.3)' }} viewBox="0 0 40 40">
        <path d="M0 20 L0 40 L20 40" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg style={{ position: 'absolute', bottom: 16, right: 16, width: 40, height: 40, color: 'rgba(0, 255, 65, 0.3)' }} viewBox="0 0 40 40">
        <path d="M40 20 L40 40 L20 40" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      
      {/* Version Badge */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        color: 'rgba(0, 255, 65, 0.4)',
      }}>
        <div style={{ width: 64, height: 1, background: 'linear-gradient(to right, transparent, rgba(0, 255, 65, 0.4))' }} />
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.3em', fontFamily: 'monospace' }}>v0.1.0</span>
        <div style={{ width: 64, height: 1, background: 'linear-gradient(to left, transparent, rgba(0, 255, 65, 0.4))' }} />
      </div>
      
      {/* Scanline Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.03) 2px, rgba(0, 255, 65, 0.03) 4px)',
        zIndex: 20,
      }} />
    </div>
  );
}
