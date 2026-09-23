'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Main Page
   Native iOS App Experience with Preloading & Optimistic UI
   ═══════════════════════════════════════════════════════════════════════════════ */

// Simple skeleton component inline to avoid import issues
function SkeletonHero() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-40 h-8 rounded-full mb-6 bg-white/5 animate-pulse" />
      <div className="w-64 sm:w-80 h-12 sm:h-16 rounded-lg mb-4 bg-white/5 animate-pulse" />
      <div className="w-32 h-px mb-8 bg-white/5" />
      <div className="w-full max-w-md h-48 rounded-2xl bg-white/5 animate-pulse" />
    </div>
  );
}

function SkeletonSection({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="w-36 h-5 bg-white/5 animate-pulse rounded" />
        <div className="w-20 h-4 bg-white/5 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-40 bg-white/5 animate-pulse rounded-xl" />
        <div className="h-40 bg-white/5 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}

// Dynamic imports with skeleton loading states
const MatrixBackground = dynamic(() => import('@/components/MatrixBackgroundPro'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black" />,
});

const HeroSection = dynamic(() => import('@/components/sections/HeroSection'), {
  loading: () => <SkeletonHero />,
});

const AboutSection = dynamic(() => import('@/components/sections/AboutSection'), {
  loading: () => <SkeletonSection className="min-h-screen p-8" />,
});

const PracticesSection = dynamic(() => import('@/components/sections/PracticesSection'), {
  loading: () => <SkeletonSection className="min-h-screen p-8" />,
});

const ProjectsSection = dynamic(() => import('@/components/sections/ProjectsSection'), {
  loading: () => <SkeletonSection className="min-h-screen p-8" />,
});

const TokenSection = dynamic(() => import('@/components/sections/TokenSection'), {
  loading: () => <SkeletonSection className="min-h-screen p-8" />,
});

const CommunitySection = dynamic(() => import('@/components/sections/CommunitySection'), {
  loading: () => <SkeletonSection className="min-h-screen p-8" />,
});

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="h-32" />,
});

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll handler with momentum detection
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
          setScrollProgress(progress);
        });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app-shell flex flex-col items-center justify-center min-h-screen px-4 max-w-screen-md mx-auto">
      {/* 3D Matrix Background */}
      <MatrixBackground />

      {/* Scroll Progress Bar - iOS style thin line */}
      <div 
        className="fixed top-0 left-0 right-0 h-[2px] z-[60] bg-transparent"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div
          className="h-full transition-all duration-100 ease-out"
          style={{ 
            width: `${scrollProgress}%`,
            background: 'linear-gradient(90deg, #00ff00, #00ff00)',
            boxShadow: '0 0 10px rgba(0, 255, 65, 0.8)',
            opacity: isScrolling ? 1 : 0,
            transition: 'opacity 0.3s ease, width 0.1s ease-out',
          }}
        />
      </div>

      {/* Main Content */}
      <main ref={containerRef} className="app-content relative z-10 flex flex-col items-center justify-center w-full max-w-screen-md mx-auto px-2">
        <Suspense fallback={<SkeletonHero />}>
          <section id="hero">
            <HeroSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="about">
            <AboutSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="practices">
            <PracticesSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="projects">
            <ProjectsSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="token">
            <TokenSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="community">
            <CommunitySection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="h-32" />}>
          <Footer />
        </Suspense>
      </main>
    </div>
  );
}
