'use client';

import { useEffect, useState, useRef } from 'react';

export default function MondaysPage() {
  const [activeSection, setActiveSection] = useState('hero');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ================= MATRIX CANVAS ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const fontSize = window.innerWidth < 768 ? 22 : 28;
    const words = [
      '♥ MEDITATION ', '♥ MONDAYS ', '♥ ALOHA ', '♥ PEACE ',
      '♥ ZEN ', '♥ YOGA ', '♥ ENERGY ', '♥ BALANCE '
    ];

    let width = window.innerWidth;
    let height = window.innerHeight;
    let columns = Math.floor(width / fontSize);
    let drops = Array.from({ length: columns }, () => ({
      y: Math.random() * height / fontSize,
      word: words[Math.floor(Math.random() * words.length)],
      index: 0,
    }));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      columns = Math.floor(width / fontSize);

      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.font = `${fontSize}px monospace`;

      drops = Array.from({ length: columns }, () => ({
        y: Math.random() * height / fontSize,
        word: words[Math.floor(Math.random() * words.length)],
        index: 0,
      }));
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ff4d4d';

      drops.forEach((d, i) => {
        ctx.fillText(d.word[d.index], i * fontSize, d.y * fontSize);
        d.index = (d.index + 1) % d.word.length;
        d.y += 0.7; // adjust speed
        if (d.y * fontSize > height && Math.random() > 0.9) d.y = 0;
      });

      requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <>
      {/* Background */}
      <div className="absolute inset-0 bg-black z-0" />

      {/* Matrix Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-screen h-screen z-5 pointer-events-none opacity-50"
      />

      {/* Main Content */}
      <main className="relative z-10 text-white pt-[calc(env(safe-area-inset-top)+48px)] space-y-4 flex flex-col items-center">

        {/* HERO */}
        <section id="hero" className="flex flex-col items-center justify-start px-8 text-center">
          <div className="relative flex items-center justify-center rounded-full border border-white/30 backdrop-blur-md w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] red-glow animate-pulse">
            <div className="p-6">
              <h1 className="text-6xl sm:text-6xl md:text-6xl font-black mb-2 bg-gradient-to-r from-red-900 to-red-500 bg-clip-text text-transparent">
                MEDITATION MONDAYS
              </h1>

              <p className="text-3xl sm:text-4xl text-red-400 tracking-wider mb-2">
                SUNSET SESSIONS
              </p>

              <p className="text-lg sm:text-base text-white/80">
                Ancient wisdom. Aloha spirit.
              </p>
            </div>
          </div>
        </section>

        {/* PRACTICES */}
        <section id="practices" className="flex justify-center px-6 text-center">
          <div className="relative flex items-center justify-center rounded-full border border-white/30 backdrop-blur-md w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] red-glow animate-pulse">
            <div className="p-6">
              <h2 className="text-4xl sm:text-4xl font-bold mb-2 text-red-400">
                EVERY MONDAY
              </h2>
              <div className="space-y-1 text-base sm:text-lg">
                <p>🧘 Meditation — 4:30 PM</p>
                <p>🕉️ Yoga — 5:30 PM</p>
                <p className="text-red-400">Lē'ahi Beach Park · Waikīkī</p>
                <p>Bring a mat and water</p>
                <p>FREE</p>
              </div>
            </div>
          </div>
        </section>

        {/* COMMUNITY */}
        <section id="community" className="flex justify-center px-6 text-center">
          <div className="relative flex flex-col items-center justify-center rounded-full border border-white/30 backdrop-blur-md w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] red-glow animate-pulse">
            <div className="p-6 flex flex-col items-center">
              <h2 className="text-4xl sm:text-4xl font-bold mb-2 text-red-400">
                COMMUNITY CIRCLE
              </h2>
              <p className="text-base sm:text-lg text-white/80 mb-4">
                Open to all. Come as you are.
              </p>

              {/* Stripe Buy Tickets Button */}
              <button
                onClick={async () => {
                  const res = await fetch('/api/checkout', { method: 'POST' });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else console.error('No URL returned from Stripe');
                }}
                className="rounded-xl border border-red-500/40 px-6 py-3 text-red-400 hover:bg-red-500/10 transition"
              >
                Buy Tickets!
              </button>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
