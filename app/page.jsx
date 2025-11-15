'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import BottomNav from '../components/BottomNav';

// Dynamic import with SSR disabled for Three.js components
const MatrixCanvas = dynamic(() => import('../components/MatrixCanvas'), {
  ssr: false,
  loading: () => <div className="canvas-full bg-black" />,
});

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Matrix Rain Background */}
      <Suspense fallback={<div className="canvas-full bg-black" />}>
        <MatrixCanvas />
      </Suspense>

      {/* Main Content */}
      <main className="site-content">
        <h1
          className="neon font-futura text-6xl md:text-8xl font-bold tracking-wide"
          style={{
            fontFamily: "'Futura Book', 'Futura', 'Courier New', monospace, sans-serif",
          }}
        >
          Patagios
        </h1>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
