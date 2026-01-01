'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import GlassNav from '@/components/GlassNav';

export default function MondaysPage() {
  const [activeSection, setActiveSection] = useState('hero');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ================= MATRIX CANVAS ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2); // cap for iPhone
    const fontSize = window.innerWidth < 768 ? 22 : 28;
    const words = ['♥ MEDITATION', '♥ MONDAYS'];

    let width = 0;
    let height = 0;
    let columns = 0;
    let drops: { y: number; word: string; index: number }[] = [];
    let raf: number;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.font = `${fontSize}px monospace`;

      columns = Math.floor(width / fontSize);
      drops = Array.from({ length: columns }, () => {
        const word = words[Math.floor(Math.random() * words.length)];
        return {
          y: Math.random() * height / fontSize,
          word,
          index: Math.floor(Math.random() * word.length),
        };
      });
    };

    let lastTime = 0;
    const draw = (time: number) => {
      if (time - lastTime < 90) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastTime = time;

      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#dc2626';

      drops.forEach((d, i) => {
        ctx.fillText(d.word[d.index], i * fontSize, d.y * fontSize);
        d.index = (d.index + 1) % d.word.length;
        d.y++;
        if (d.y * fontSize > height && Math.random() > 0.975) d.y = 0;
      });

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ================= NAV SYNC ================= */
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.6 }
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleNavigate = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Matrix Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 opacity-30 pointer-events-none"
      />

      {/* Glass Navigation */}
      <GlassNav activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Main Content */}
      <main className="relative z-10 bg-black text-white pt-[calc(env(safe-area-inset-top)+96px)]">

        {/* HERO */}
        <section
          id="hero"
          className="min-h-[90vh] flex flex-col items-center justify-center px-4 text-center"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent">
            MEDITATION MONDAYS
          </h1>

          <p className="text-xl sm:text-2xl text-red-400 tracking-wider mb-6">
            Sunset Sessions
          </p>

          <p className="max-w-xl text-base sm:text-lg text-white/80">
            Ancient wisdom. Modern science. Presence by the sea.
          </p>
        </section>

        {/* ABOUT */}
        <section id="about" className="py-24 px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-red-400">
            The Experience
          </h2>
          <p className="max-w-2xl mx-auto text-white/80 leading-relaxed">
            Breath-led meditation, gentle yoga flow, and intentional
            community connection in one of Oʻahu’s most beautiful settings.
          </p>
        </section>

        {/* PRACTICES */}
        <section id="practices" className="py-24 px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-red-400">
            Mondays Schedule
          </h2>
          <div className="space-y-4 text-lg">
            <p>🧘 Meditation — 4:30 PM</p>
            <p>🕉️ Yoga — 5:30 PM</p>
            <p className="text-red-400">
              Lē&apos;ahi Beach Park · Waikīkī
            </p>
          </div>
        </section>

        {/* COMMUNITY */}
        <section id="community" className="py-24 px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-red-400">
            Community
          </h2>
          <p className="max-w-xl mx-auto text-white/80">
            Open to all levels. Free. Come as you are.
          </p>

          <Link
            href="/"
            className="inline-block mt-10 rounded-xl border border-red-500/40 px-6 py-3 text-red-400 hover:bg-red-500/10 transition"
          >
            ← Back to Home
          </Link>
        </section>

      </main>
    </>
  );
}
