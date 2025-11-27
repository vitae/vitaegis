"use client";

import { useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// VITAEGIS MATRIX RAIN - Canvas2D Version
// Inspired by Rezmason's Matrix (github.com/Rezmason/matrix)
// Key techniques: Sawtooth wave illumination, non-colliding multi-stream drops
// ═══════════════════════════════════════════════════════════════════════════════

const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>◊◆◇○●□■△▽∞∑∏√∫≈≠≤≥";

// Deterministic hash for consistent randomness
const hash = (x: number, y: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
};

// Sawtooth wave - core of Rezmason's raindrop illumination
const sawtooth = (x: number, period: number): number => {
  return (((x % period) + period) % period) / period;
};

interface Stream {
  speed: number;
  length: number;
  phase: number;
  period: number;
}

interface GlyphData {
  char: string;
  cycleOffset: number;
  cycleSpeed: number;
}

interface ColumnData {
  streams: Stream[];
  glyphs: GlyphData[];
}

interface MatrixRainProps {
  opacity?: number;
  fallSpeed?: number;
  density?: number;
  glowIntensity?: number;
  primaryColor?: string;
}

export default function MatrixRain({
  opacity = 1,
  fallSpeed = 1,
  density = 1,
  glowIntensity = 1,
  primaryColor = "#00ff6a",
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const columnsRef = useRef<ColumnData[]>([]);
  const lastColumnsCount = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Parse primary color to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 255, b: 106 };
    };

    const color = hexToRgb(primaryColor);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Configuration
      const fontSize = Math.max(12, Math.floor(14 * density));
      const columns = Math.floor(width / fontSize);
      const rows = Math.floor(height / fontSize);

      // Reinitialize columns if count changed
      if (columns !== lastColumnsCount.current) {
        lastColumnsCount.current = columns;
        columnsRef.current = [];

        for (let i = 0; i < columns; i++) {
          const streams: Stream[] = [];
          const numStreams = 2 + Math.floor(hash(i, 0) * 2);

          for (let s = 0; s < numStreams; s++) {
            streams.push({
              speed: (0.3 + hash(i, s * 100) * 0.7) * fallSpeed,
              length: 8 + hash(i, s * 200) * 12,
              phase: hash(i, s * 300) * 100,
              period: 15 + hash(i, s * 400) * 20,
            });
          }

          columnsRef.current.push({
            streams,
            glyphs: Array(rows)
              .fill(0)
              .map((_, r) => ({
                char: GLYPHS[Math.floor(hash(i, r) * GLYPHS.length)],
                cycleOffset: hash(i * 100, r * 100) * 100,
                cycleSpeed: 0.2 + hash(i * 200, r * 200) * 0.3,
              })),
          });
        }
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      // Clear with trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, width, height);

      // Draw columns
      for (let col = 0; col < columns; col++) {
        const columnData = columnsRef.current[col];
        if (!columnData) continue;

        const x = col * fontSize;

        for (let row = 0; row < rows; row++) {
          const y = (row + 1) * fontSize;
          const glyphData = columnData.glyphs[row];
          if (!glyphData) continue;

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
              const normalized = sawPos / dropEnd;
              const trailBrightness = Math.exp(-normalized * 4);
              brightness = Math.max(brightness, trailBrightness);

              if (sawPos < 0.03) {
                isCursor = true;
              }
            }
          }

          if (brightness > 0.01) {
            // Cycle glyphs based on brightness
            const cycleTime =
              elapsed * glyphData.cycleSpeed * (0.3 + brightness * 0.7) +
              glyphData.cycleOffset;
            const glyphIndex = Math.floor(cycleTime) % GLYPHS.length;
            const char = GLYPHS[glyphIndex];

            // Color calculation
            let r: number, g: number, b: number;
            if (isCursor) {
              r = 255;
              g = 255;
              b = 255;
            } else {
              r = Math.floor(brightness * (color.r * 0.3));
              g = Math.floor(30 + brightness * (color.g * 0.8));
              b = Math.floor(brightness * (color.b * 0.5));
            }

            const alpha = Math.min(1, brightness * 1.5);

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.font = `bold ${fontSize}px "MS Gothic", "Yu Gothic", "Noto Sans JP", monospace`;
            ctx.fillText(char, x, y);

            // Glow effect
            if (brightness > 0.5 && glowIntensity > 0) {
              ctx.shadowColor = primaryColor;
              ctx.shadowBlur = brightness * 15 * glowIntensity;
              ctx.fillText(char, x, y);
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      // Scanline effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
      for (let i = 0; i < height; i += 4) {
        ctx.fillRect(0, i, width, 2);
      }

      // Vignette
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        height * 0.2,
        width / 2,
        height / 2,
        height * 0.9
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [fallSpeed, density, glowIntensity, primaryColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        opacity,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
