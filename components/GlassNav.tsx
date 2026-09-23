'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HiHome, HiInformationCircle, HiVideoCamera, HiShoppingBag, HiUserGroup, HiCollection, HiChevronDown, HiX, HiViewGrid } from 'react-icons/hi';
import { projects } from '@/components/projects';
import BottomNav from '@/components/BottomNav';

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
 * Site navigation, rendered once from the root layout.
 * Mobile: full-width top bar with a projects sheet, plus the bottom tab bar on every page.
 * Desktop: pinned glass bar with a PROJECTS menu that opens on hover or click.
 * On the home page section buttons scroll; anywhere else they route back to the home anchor.
 */
export default function GlassNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [menuOpen, setMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  const onProjectPage = pathname === '/projects' || projects.some((p) => pathname.startsWith(p.href));
  const currentSection = isHome ? activeSection : onProjectPage ? 'projects' : '';

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      if (!isHome || ticking) return;
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

  // Close the menus on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape or a click outside the desktop menu closes it; lock body scroll while the mobile sheet is open
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (window.innerWidth < 768) return;
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    const isMobile = window.innerWidth < 768;
    if (isMobile) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      if (isMobile) document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleNavigate = (id: string) => {
    setMenuOpen(false);
    if (!isHome) {
      router.push(id === 'hero' ? '/' : `/#${id}`);
      return;
    }
    const element = document.getElementById(id);
    if (!element) return;
    const offset = window.innerWidth >= 768 ? 80 : 64;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const barSurface = isScrolled || menuOpen
    ? 'bg-black/80 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
    : 'bg-black/50 backdrop-blur-lg border-white/5';

  return (
    <>
    {/* Tapping outside the mobile projects sheet closes it */}
    {menuOpen && (
      <div aria-hidden onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />
    )}
    <nav
      aria-label="Main"
      className="fixed top-0 left-0 right-0 z-50"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden px-3 pt-2">
        <div className={`relative flex items-center justify-between h-14 pl-2 pr-1 rounded-2xl border transition-colors duration-300 ${barSurface}`}>
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />

          <button
            onClick={() => handleNavigate('hero')}
            aria-label="VITAEGIS home"
            className="flex items-center gap-2 min-h-[44px] px-1 active:opacity-70"
          >
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/50 flex items-center justify-center">
              <span className="text-vitae-green font-bold text-base">V</span>
            </span>
            <span className="text-base font-semibold tracking-[0.2em]">VITAEGIS</span>
          </button>

          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-projects-sheet"
            aria-label={menuOpen ? 'Close projects menu' : 'Open projects menu'}
            className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors active:scale-95 ${
              menuOpen ? 'text-vitae-green bg-vitae-green/10' : 'text-white/80'
            }`}
          >
            {menuOpen ? <HiX size={22} /> : <HiViewGrid size={22} />}
          </button>
        </div>

        {/* Projects sheet */}
        {menuOpen && (
          <div
            id="mobile-projects-sheet"
            className="mt-2 max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-black/95 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
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
                  className={`flex items-center gap-3 rounded-xl px-3 min-h-[52px] text-left transition-colors active:bg-white/10 ${
                    isCurrent ? 'bg-vitae-green/10 text-white' : 'text-white/80'
                  }`}
                >
                  <PIcon size={20} className="shrink-0 text-vitae-green" />
                  <span className="flex flex-col py-2">
                    <span className="text-sm font-medium leading-tight">{project.title}</span>
                    <span className="text-[0.6rem] tracking-[0.2em] text-white/40">{project.label}</span>
                  </span>
                </Link>
              );
            })}
            <Link
              href="/projects"
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex items-center justify-center min-h-[44px] rounded-xl border border-vitae-green/30 px-3 text-xs uppercase tracking-[0.2em] text-vitae-green active:bg-vitae-green/10"
            >
              All projects
            </Link>
          </div>
        )}
      </div>

      {/* ── Desktop / tablet bar ───────────────────────────────────────── */}
      <div
        className={`hidden md:flex justify-center px-6 lg:px-8 transition-all duration-500 ${
          isScrolled ? 'pt-2' : 'pt-4'
        }`}
      >
        <div className={`relative flex items-center gap-2 lg:gap-4 px-3 lg:px-5 py-2 lg:py-3 rounded-2xl border transition-all duration-500 ${barSurface}`}>
          {/* Top edge glow */}
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />

          {/* Logo */}
          <button
            onClick={() => handleNavigate('hero')}
            aria-label="VITAEGIS home"
            className="group flex items-center gap-2 lg:gap-3 mr-1"
          >
            <div className="relative">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/50 flex items-center justify-center group-hover:border-vitae-green transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                <span className="text-vitae-green font-bold text-base lg:text-lg">V</span>
              </div>
              <div className="absolute -inset-1 bg-vitae-green/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-lg lg:text-xl font-semibold tracking-wider hidden xl:block">
              VITAEGIS
            </span>
          </button>

          {/* Links with icons; labels appear from lg up, tooltips cover the icon-only tablet width */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              const isProjects = item.id === 'projects';

              const button = (
                <button
                  onClick={() => (isProjects ? setMenuOpen((open) => !open) : handleNavigate(item.id))}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={isActive ? 'true' : undefined}
                  {...(isProjects && { 'aria-expanded': menuOpen, 'aria-haspopup': 'menu' as const })}
                  className={`relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive || (isProjects && menuOpen)
                      ? 'text-vitae-green bg-vitae-green/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-vitae-green' : ''} />
                  <span className="hidden lg:inline">{item.label}</span>
                  {isProjects && (
                    <HiChevronDown size={14} className={`hidden lg:inline opacity-60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  )}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-vitae-green rounded-full shadow-[0_0_10px_#00ff00]" />
                  )}
                </button>
              );

              if (!isProjects) return <span key={item.id}>{button}</span>;

              // PROJECTS opens a menu of every project page on hover, click or keyboard focus.
              return (
                <div key={item.id} ref={desktopMenuRef} className="group relative">
                  {button}
                  <div
                    className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 transition-all duration-200 ${
                      menuOpen
                        ? 'visible opacity-100'
                        : 'invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
                    }`}
                  >
                    {/* Solid surface: a blur nested inside the bar's backdrop-filter doesn't render */}
                    <div role="menu" className="relative w-64 rounded-2xl border border-white/10 bg-[#050805] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
                      <div className="absolute -top-px left-1/2 h-px w-1/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />
                      {projects.map((project) => {
                        const PIcon = project.icon;
                        return (
                          <Link
                            key={project.href}
                            href={project.href}
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white focus:outline-none"
                          >
                            <PIcon size={16} className="shrink-0 text-vitae-green" />
                            <span className="flex flex-col">
                              <span className="font-medium">{project.title}</span>
                              <span className="text-[0.6rem] tracking-[0.2em] text-white/40">{project.label}</span>
                            </span>
                          </Link>
                        );
                      })}
                      <Link
                        href="/projects"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="mt-1 flex items-center justify-center rounded-xl border border-vitae-green/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-vitae-green transition-colors hover:bg-vitae-green/10"
                      >
                        All projects
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile tab bar on every page */}
    <BottomNav activeSection={currentSection} onNavigate={handleNavigate} />

    {/* Sub-pages start below the pinned nav; the home hero is full-height and centres itself */}
    {!isHome && (
      <div
        aria-hidden
        className="h-[4.5rem] md:h-24 w-full shrink-0"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
      />
    )}
    </>
  );
}
