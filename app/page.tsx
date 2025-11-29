'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import GlassNav from '@/components/GlassNav';
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

  const sections = [
    { id: 'hero', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'practices', label: 'Practices' },
    { id: 'token', label: 'Token' },
    { id: 'community', label: 'Community' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);

      // Determine active section
      const sectionElements = sections.map((s) => document.getElementById(s.id));
      const viewportMiddle = scrollTop + window.innerHeight / 2;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= viewportMiddle) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
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

      {/* Glassmorphic Navigation */}
      <GlassNav
        sections={sections}
        activeSection={activeSection}
        onNavigate={scrollToSection}
      />

      {/* Content Sections */}
      <div className="relative z-10">
        <HeroSection />
        <AboutSection />
        <PracticesSection />
        <TokenSection />
        <CommunitySection />
        <Footer />
      </div>

      {/* Mobile Bottom Nav Indicator */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 md:hidden">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              activeSection === section.id
                ? 'bg-vitae-green w-6 shadow-[0_0_10px_#00ff00]'
                : 'bg-white/30'
            }`}
            aria-label={`Go to ${section.label}`}
          />
        ))}
      </div>
    </main>
  );
}

