'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';

// Dynamic import with SSR disabled for Three.js components
const MatrixCanvas = dynamic(() => import('../components/MatrixCanvas'), {
  ssr: false,
  loading: () => <div className="canvas-full bg-black" />,
});

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Matrix Rain Background */}
      <Suspense fallback={<div className="canvas-full bg-black" />}>
        <MatrixCanvas />
      </Suspense>

      {/* Main Content */}
      <main className="site-content flex-grow">
        <h1
          className="neon text-6xl md:text-8xl tracking-wide"
          style={{
            fontFamily: "'Futura Book', 'Futura', sans-serif",
            fontWeight: 400,
          }}
        >
          VITAEGIS
        </h1>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Footer */}
      <Footer />
    </div>
  );
}
