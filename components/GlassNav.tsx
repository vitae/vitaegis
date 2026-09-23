'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HiHome, HiInformationCircle, HiVideoCamera, HiShoppingBag, HiUserGroup, HiCollection, HiChevronDown } from 'react-icons/hi';
import { projects } from '@/components/projects';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const navItems: NavItem[] = [
  { id: 'hero', label: 'HOME', icon: HiHome },
  { id: 'about', label: 'ABOUT', icon: HiInformationCircle },
  { id: 'practices', label: 'LIVE', icon: HiVideoCamera },
  { id: 'projects', label: 'PROJECTS', icon: HiCollection },
  { id: 'token', label: 'STORE', icon: HiShoppingBag },
  { id: 'community', label: 'CONNECT', icon: HiUserGroup },
];

const SECTION_IDS = navItems.map((item) => item.id);

/**
 * Site navigation, rendered once from the root layout. Docked to the bottom of the screen
 * on mobile and the top on desktop; PROJECTS opens a sheet of every project page next to it.
 * On the home page section tabs scroll; anywhere else they route back to the home anchor.
 */
export default function GlassNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const [activeSection, setActiveSection] = useState('hero');
  const [menuOpen, setMenuOpen] = useState(false);

  const onProjectPage = pathname === '/projects' || projects.some((p) => pathname.startsWith(p.href));
  const currentSection = isHome ? activeSection : onProjectPage ? 'projects' : '';

  useEffect(() => {
    if (!isHome) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const viewportMiddle = window.scrollY + window.innerHeight / 2;
        for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
          const el = document.getElementById(SECTION_IDS[i]);
          if (el && el.offsetTop <= viewportMiddle) {
            setActiveSection(SECTION_IDS[i]);
            break;
          }
        }
        ticking = false;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Close the projects sheet on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes the sheet; the page behind it stays put while it is open
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleNavigate = (id: string) => {
    if (id === 'projects') {
      setMenuOpen((open) => !open);
      return;
    }
    setMenuOpen(false);
    if (!isHome) {
      router.push(id === 'hero' ? '/' : `/#${id}`);
      return;
    }
    const element = document.getElementById(id);
    if (!element) return;
    const offset = window.innerWidth >= 768 ? 104 : 16;
    const top = id === 'hero' ? 0 : element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <>
    {/* Tapping outside the projects sheet closes it */}
    {menuOpen && (
      <div aria-hidden onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/60" />
    )}

    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 md:bottom-auto md:top-0"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="relative mx-2 mb-2 md:mx-auto md:mb-0 md:mt-4 md:max-w-3xl">
        {/* Projects sheet: opens upward from the bar on mobile, downward on desktop */}
        {menuOpen && (
          <div
            id="projects-sheet"
            className="absolute inset-x-0 bottom-full mb-2 md:bottom-auto md:top-full md:mb-0 md:mt-2 max-h-[calc(100dvh-6.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#050805] p-2 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] md:shadow-[0_8px_32px_rgba(0,0,0,0.6)] md:right-auto md:left-1/2 md:w-96 md:-translate-x-1/2"
          >
            <p className="px-3 pt-2 pb-1 text-left text-[0.65rem] tracking-[0.3em] text-vitae-green/80">PROJECTS</p>
            {projects.map((project) => {
              const PIcon = project.icon;
              const isCurrent = pathname.startsWith(project.href);
              return (
                <Link
                  key={project.href}
                  href={project.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-left transition-colors hover:bg-white/5 active:bg-white/10 ${
                    isCurrent ? 'bg-vitae-green/10 text-white' : 'text-white/80'
                  }`}
                >
                  <PIcon size={20} className="shrink-0 text-vitae-green" />
                  <span className="flex min-w-0 flex-col py-2">
                    <span className="truncate text-sm font-medium leading-tight">{project.title}</span>
                    <span className="text-[0.6rem] tracking-[0.2em] text-white/40">{project.label}</span>
                  </span>
                </Link>
              );
            })}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Link
                href="/projects"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center min-h-[44px] rounded-xl border border-vitae-green/30 px-2 text-[0.65rem] uppercase tracking-[0.2em] text-vitae-green hover:bg-vitae-green/10 active:bg-vitae-green/10"
              >
                All projects
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (isHome) document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
                  else router.push('/#projects');
                }}
                className="flex items-center justify-center min-h-[44px] rounded-xl border border-white/10 px-2 text-[0.65rem] uppercase tracking-[0.2em] text-white/70 hover:bg-white/5 active:bg-white/10"
              >
                Home section
              </button>
            </div>
          </div>
        )}

        {/* Bar */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/85 backdrop-blur-xl shadow-[0_-4px_32px_rgba(0,0,0,0.5)] md:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />

          <div className="flex items-stretch justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isProjects = item.id === 'projects';
              const isActive = isProjects ? menuOpen || currentSection === 'projects' : currentSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  aria-current={isActive && !isProjects ? 'true' : undefined}
                  {...(isProjects && { 'aria-expanded': menuOpen, 'aria-controls': 'projects-sheet' })}
                  className={`relative flex min-w-0 flex-1 flex-col md:flex-row items-center justify-center gap-1 md:gap-2 min-h-[56px] px-1 transition-colors duration-200 active:scale-95 ${
                    isActive ? 'text-vitae-green' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {isActive && <span className="absolute inset-x-1 inset-y-1 rounded-xl bg-vitae-green/10" />}
                  <Icon size={22} className="relative z-10 shrink-0 md:w-[18px] md:h-[18px]" />
                  <span className="relative z-10 flex items-center gap-1 truncate text-[9px] md:text-xs font-medium tracking-wide">
                    {item.label}
                    {isProjects && (
                      <HiChevronDown size={12} className={`hidden md:inline transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
