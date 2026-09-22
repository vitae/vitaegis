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
 * Pinned top nav, rendered once from the root layout. On the home page the section
 * buttons scroll; anywhere else they route back to the matching home anchor.
 */
export default function GlassNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

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

  const handleNavigate = (id: string) => {
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

  return (
    <>
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'py-2' : 'py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center w-full text-center">
        <div
          className={`relative flex items-center justify-between px-4 lg:px-6 py-2 lg:py-3 rounded-2xl transition-all duration-500 ${
            isScrolled
              ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
              : 'bg-black/20 backdrop-blur-lg border border-white/5'
          }`}
        >
          {/* Top edge glow */}
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />

          {/* Logo */}
          <button
            onClick={() => handleNavigate('hero')}
            className="group flex items-center gap-2 lg:gap-3"
          >
            <div className="relative">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/50 flex items-center justify-center group-hover:border-vitae-green transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                <span className="text-vitae-green font-bold text-base lg:text-lg">V</span>
              </div>
              <div className="absolute -inset-1 bg-vitae-green/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-lg lg:text-xl font-semibold tracking-wider hidden lg:block">
              VITAEGIS
            </span>
          </button>

          {/* Desktop Links with Icons */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isHome && activeSection === item.id;

              const button = (
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-vitae-green bg-vitae-green/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-vitae-green' : ''} />
                  <span className="hidden lg:inline">{item.label}</span>
                  {item.id === 'projects' && <HiChevronDown size={14} className="hidden lg:inline opacity-60" />}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-vitae-green rounded-full shadow-[0_0_10px_#00ff00]" />
                  )}
                </button>
              );

              if (item.id !== 'projects') return <span key={item.id}>{button}</span>;

              // PROJECTS opens a menu of every project page on hover or keyboard focus.
              return (
                <div key={item.id} className="group relative">
                  {button}
                  <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="w-64 rounded-2xl border border-white/10 bg-black/80 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                      <div className="absolute -top-px left-1/2 h-px w-1/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-vitae-green/50 to-transparent" />
                      {projects.map((project) => {
                        const PIcon = project.icon;
                        return (
                          <Link
                            key={project.href}
                            href={project.href}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
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

          {/* Mobile: single link to the projects hub */}
          <Link
            href="/projects"
            className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium tracking-wider text-white/70 hover:text-white hover:bg-white/5 min-h-[40px]"
          >
            <HiCollection size={16} />
            PROJECTS
          </Link>

        </div>
      </div>
    </nav>
    {/* Sub-pages start below the pinned nav; the home hero is full-height and centres itself */}
    {!isHome && <div aria-hidden className="h-20 md:h-24 w-full shrink-0" />}
    </>
  );
}   

