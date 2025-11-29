'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import GlassNav from '@/components/GlassNav';
import BottomNav from '@/components/BottomNav';
import { SkeletonHero, SkeletonSection } from '@/components/Skeleton';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Main Page
   Native iOS App Experience with Preloading & Optimistic UI
   ═══════════════════════════════════════════════════════════════════════════════ */

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
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Section IDs for scroll detection
  const sectionIds = ['hero', 'about', 'practices', 'token', 'community'];

  // Preload sections above and below viewport
  useEffect(() => {
    const preloadSections = () => {
      const currentIndex = sectionIds.indexOf(activeSection);
      
      // Preload adjacent sections
      [-1, 1, 2].forEach((offset) => {
        const targetIndex = currentIndex + offset;
        if (targetIndex >= 0 && targetIndex < sectionIds.length) {
          const sectionId = sectionIds[targetIndex];
          const element = document.getElementById(sectionId);
          if (element) {
            // Trigger intersection observer by scrolling element into near-viewport
            element.style.contentVisibility = 'visible';
          }
        }
      });
    };

    preloadSections();
  }, [activeSection]);

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
              break;
            }
          }

          // Track scrolling state for UI effects
          setIsScrolling(true);
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
          }, 150);

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
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
          <section id="hero" className="preload-above">
            <HeroSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="about" className="preload-below">
            <AboutSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="practices" className="preload-below">
            <PracticesSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="token" className="preload-below">
            <TokenSection />
          </section>
        </Suspense>

        <Suspense fallback={<SkeletonSection className="min-h-screen p-8" />}>
          <section id="community" className="preload-below">
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
