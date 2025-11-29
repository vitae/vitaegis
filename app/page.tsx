'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import GlassNav from '@/components/GlassNav';
import BottomNav from '@/components/BottomNav';
import HeroSection from '@/components/sections/HeroSection';
import AboutSection from '@/components/sections/AboutSection';
import PracticesSection from '@/components/sections/PracticesSection';
import TokenSection from '@/components/sections/TokenSection';
import CommunitySection from '@/components/sections/CommunitySection';
import Footer from '@/components/Footer';

// Dynamic import for Three.js to avoid SSR issues
const MatrixBackground = dynamic(() => import('@/components/MatrixBackgroundPro'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black" />,
});

export default function Home() {
  const [activeSection, setActiveSection] = useState('hero');
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Section IDs for scroll detection
  const sectionIds = ['hero', 'about', 'practices', 'token', 'community'];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);

      // Determine active section
      const sectionElements = sectionIds.map((id) => document.getElementById(id));
      const viewportMiddle = scrollTop + window.innerHeight / 2;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= viewportMiddle) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main ref={containerRef} className="relative min-h-screen text-white">
      {/* 3D Matrix Background - renders behind all content */}
      <MatrixBackground />

      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-[60] bg-black/50">
        <div
          className="h-full bg-gradient-to-r from-vitae-green via-emerald-400 to-vitae-green transition-all duration-150"
          style={{ width: `${scrollProgress}%`, boxShadow: '0 0 20px #00ff00, 0 0 40px #00ff00' }}
        />
      </div>

      {/* Glassmorphic Top Navigation - desktop only */}
      <div className="hidden md:block">
        <GlassNav
          activeSection={activeSection}
          onNavigate={scrollToSection}
        />
      </div>

      {/* Content Sections */}
      <div className="relative z-10 pb-20 md:pb-8">
        <HeroSection />
        <AboutSection />
        <PracticesSection />
        <TokenSection />
        <CommunitySection />
        <Footer />
      </div>

      {/* Glassmorphic Bottom Navigation - mobile only */}
      <BottomNav 
        activeSection={activeSection} 
        onNavigate={scrollToSection} 
      />
    </main>
  );
}
