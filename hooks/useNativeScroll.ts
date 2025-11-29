'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   useNativeScroll - iOS-Like Scroll Physics Hook
   Buttery smooth inertia, rubber-band edges, momentum scrolling
   ═══════════════════════════════════════════════════════════════════════════════ */

interface ScrollState {
  scrollY: number;
  scrollProgress: number;
  velocity: number;
  isScrolling: boolean;
  direction: 'up' | 'down' | 'idle';
  isAtTop: boolean;
  isAtBottom: boolean;
  activeSection: string;
}

interface UseNativeScrollOptions {
  sectionIds?: string[];
  throttleMs?: number;
  onSectionChange?: (sectionId: string) => void;
}

export function useNativeScroll(options: UseNativeScrollOptions = {}) {
  const {
    sectionIds = [],
    throttleMs = 16, // ~60fps
    onSectionChange,
  } = options;

  const [state, setState] = useState<ScrollState>({
    scrollY: 0,
    scrollProgress: 0,
    velocity: 0,
    isScrolling: false,
    direction: 'idle',
    isAtTop: true,
    isAtBottom: false,
    activeSection: sectionIds[0] || '',
  });

  const lastScrollY = useRef(0);
  const lastTime = useRef(Date.now());
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const rafId = useRef<number>();
  const velocityHistory = useRef<number[]>([]);

  // Calculate velocity with smoothing
  const calculateVelocity = useCallback((currentY: number, currentTime: number) => {
    const deltaY = currentY - lastScrollY.current;
    const deltaTime = currentTime - lastTime.current;
    
    if (deltaTime === 0) return 0;
    
    const instantVelocity = deltaY / deltaTime;
    velocityHistory.current.push(instantVelocity);
    
    // Keep only last 5 velocity samples for smoothing
    if (velocityHistory.current.length > 5) {
      velocityHistory.current.shift();
    }
    
    // Return averaged velocity
    return velocityHistory.current.reduce((a, b) => a + b, 0) / velocityHistory.current.length;
  }, []);

  // Determine active section based on scroll position
  const getActiveSection = useCallback((scrollY: number) => {
    if (sectionIds.length === 0) return '';
    
    const viewportMiddle = scrollY + window.innerHeight / 2;
    
    for (let i = sectionIds.length - 1; i >= 0; i--) {
      const element = document.getElementById(sectionIds[i]);
      if (element && element.offsetTop <= viewportMiddle) {
        return sectionIds[i];
      }
    }
    
    return sectionIds[0];
  }, [sectionIds]);

  // Main scroll handler with RAF for smooth performance
  const handleScroll = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const currentTime = Date.now();
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      
      const velocity = calculateVelocity(scrollY, currentTime);
      const direction = velocity > 0.1 ? 'down' : velocity < -0.1 ? 'up' : 'idle';
      const isAtTop = scrollY <= 0;
      const isAtBottom = scrollY >= docHeight - 1;
      const activeSection = getActiveSection(scrollY);

      // Track section changes
      if (activeSection !== state.activeSection && onSectionChange) {
        onSectionChange(activeSection);
      }

      setState({
        scrollY,
        scrollProgress,
        velocity,
        isScrolling: true,
        direction,
        isAtTop,
        isAtBottom,
        activeSection,
      });

      lastScrollY.current = scrollY;
      lastTime.current = currentTime;

      // Reset scrolling state after inactivity
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        setState(prev => ({ ...prev, isScrolling: false, direction: 'idle' }));
        velocityHistory.current = [];
      }, 150);
    });
  }, [calculateVelocity, getActiveSection, onSectionChange, state.activeSection]);

  // Smooth scroll to section with iOS-like easing
  const scrollToSection = useCallback((sectionId: string, options?: { offset?: number }) => {
    const element = document.getElementById(sectionId);
    if (!element) return;

    const offset = options?.offset ?? (window.innerWidth >= 768 ? 80 : 0);
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const targetPosition = elementPosition - offset;

    // Use native smooth scroll with iOS-like behavior
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  }, []);

  // Scroll to top with bounce effect
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    // Set up scroll listener with passive flag for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll]);

  return {
    ...state,
    scrollToSection,
    scrollToTop,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   useIntersectionPreload - Preload content above/below viewport
   ═══════════════════════════════════════════════════════════════════════════════ */

interface PreloadOptions {
  rootMargin?: string;
  threshold?: number;
}

export function useIntersectionPreload(
  ref: React.RefObject<HTMLElement>,
  options: PreloadOptions = {}
) {
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsNearViewport(entry.isIntersecting);
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
          }
        });
      },
      {
        rootMargin: options.rootMargin ?? '200px 0px', // Preload 200px before entering viewport
        threshold: options.threshold ?? 0,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options.rootMargin, options.threshold]);

  return { isNearViewport, hasBeenVisible };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   useHapticFeedback - Simulated haptic feedback via visual/audio cues
   ═══════════════════════════════════════════════════════════════════════════════ */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export function useHapticFeedback() {
  const trigger = useCallback((style: HapticStyle = 'light') => {
    // Check if device supports vibration
    if ('vibrate' in navigator) {
      const patterns: Record<HapticStyle, number[]> = {
        light: [10],
        medium: [20],
        heavy: [30],
        selection: [5],
        success: [10, 50, 10],
        warning: [20, 50, 20],
        error: [30, 50, 30, 50, 30],
      };
      navigator.vibrate(patterns[style]);
    }
  }, []);

  return { trigger };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   useTouchFeedback - Touch press animation state
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useTouchFeedback() {
  const [isPressed, setIsPressed] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handlers = {
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => {
      setIsPressed(false);
      setIsBouncing(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsBouncing(false), 300);
    },
    onTouchCancel: () => setIsPressed(false),
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => {
      setIsPressed(false);
      setIsBouncing(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsBouncing(false), 300);
    },
    onMouseLeave: () => setIsPressed(false),
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    isPressed,
    isBouncing,
    handlers,
    style: {
      transform: isPressed 
        ? 'scale(0.97) translateZ(0)' 
        : isBouncing 
          ? 'scale(1.02) translateZ(0)' 
          : 'scale(1) translateZ(0)',
      transition: isPressed
        ? 'transform 0.1s ease-out'
        : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  };
}

export default useNativeScroll;
