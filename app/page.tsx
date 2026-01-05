'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import GlassNav from '@/components/GlassNav';
import BottomNav from '@/components/BottomNav';

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
  const [activeSection, setActiveSection] = useState('hero');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Section IDs for scroll detection
  const sectionIds = ['hero', 'about', 'practices', 'token', 'community'];

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

          // Detect active section
          const viewportMiddle = scrollTop + window.innerHeight / 2;
          for (let i = sectionIds.length - 1; i >= 0; i--) {
            const el = document.getElementById(sectionIds[i]);
            if (el && el.offsetTop <= viewportMiddle) {
              setActiveSection(sectionIds[i]);
              return (
                <>
                  <MatrixBackground />
                  <div ref={containerRef} className="app-container app-content w-full max-w-7xl mx-auto px-4 flex flex-col min-h-screen justify-center">
                    <GlassNav activeSection={activeSection} scrollProgress={scrollProgress} />
                    <main className="flex-1 flex flex-col w-full items-center justify-center">
                      <Suspense fallback={<SkeletonHero />}>
                        <HeroSection />
                      </Suspense>
                      <Suspense fallback={<SkeletonSection className=\"min-h-screen p-8\" />}>
                        <AboutSection />
                      </Suspense>
                      <Suspense fallback={<SkeletonSection className=\"min-h-screen p-8\" />}>
                        <PracticesSection />
                      </Suspense>
                      <Suspense fallback={<SkeletonSection className=\"min-h-screen p-8\" />}>
                        <TokenSection />
                      </Suspense>
                      <Suspense fallback={<SkeletonSection className=\"min-h-screen p-8\" />}>
                        <CommunitySection />
                      </Suspense>
                    </main>
                    <Footer />
                    <BottomNav />
                  </div>
                </>
              );
    };
  }, []);

  // Smooth scroll to section with iOS-like behavior
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Calculate offset for fixed headers
      const offset = window.innerWidth >= 768 ? 80 : 0;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="app-shell">
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
            background: 'linear-gradient(90deg, #00ff00, #00ff41)',
            boxShadow: '0 0 10px rgba(0, 255, 65, 0.8)',
            opacity: isScrolling ? 1 : 0,
            transition: 'opacity 0.3s ease, width 0.1s ease-out',
          }}
        />
      </div>

      {/* Top Navigation - Desktop only */}
      <div className="hidden md:block">
        <GlassNav
          activeSection={activeSection}
          onNavigate={scrollToSection}
        />
      </div>

      {/* Main Content */}
      <main ref={containerRef} className="app-content relative z-10">
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

      {/* Bottom Navigation - Mobile only */}
      <BottomNav 
        activeSection={activeSection} 
        onNavigate={scrollToSection} 
      />
    </div>
  );
}
