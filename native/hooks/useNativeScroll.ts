import { useCallback, useRef, useEffect } from 'react';
import { Platform, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  withSpring,
  withTiming,
  runOnJS,
  SharedValue,
  AnimatedScrollViewProps,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { animations } from '@/constants/theme';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - useNativeScroll Hook (React Native)
   Buttery Smooth Scrolling with Physics & Haptics
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface SectionInfo {
  id: string;
  offsetY: number;
  height: number;
}

interface UseNativeScrollOptions {
  sections?: SectionInfo[];
  onSectionChange?: (sectionId: string) => void;
  hapticFeedback?: boolean;
}

interface UseNativeScrollReturn {
  scrollY: SharedValue<number>;
  scrollVelocity: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  activeSection: SharedValue<string>;
  scrollProgress: SharedValue<number>;
  isScrolling: SharedValue<boolean>;
}

export function useNativeScroll({
  sections = [],
  onSectionChange,
  hapticFeedback = true,
}: UseNativeScrollOptions = {}): UseNativeScrollReturn {
  const scrollY = useSharedValue(0);
  const scrollVelocity = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const activeSection = useSharedValue(sections[0]?.id ?? 'home');
  const scrollProgress = useSharedValue(0);
  const isScrolling = useSharedValue(false);
  const lastSectionId = useRef<string>(sections[0]?.id ?? 'home');

  // Trigger haptic feedback
  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, [hapticFeedback]);

  // Handle section change callback
  const handleSectionChange = useCallback(
    (sectionId: string) => {
      if (sectionId !== lastSectionId.current) {
        lastSectionId.current = sectionId;
        triggerHaptic();
        onSectionChange?.(sectionId);
      }
    },
    [onSectionChange, triggerHaptic]
  );

  // Animated scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const velocity = currentY - lastScrollY.value;

      // Update values
      scrollY.value = currentY;
      scrollVelocity.value = velocity;
      lastScrollY.value = currentY;
      isScrolling.value = true;

      // Calculate scroll progress (0 to 1)
      const contentHeight = event.contentSize.height;
      const viewportHeight = event.layoutMeasurement.height;
      scrollProgress.value = contentHeight > viewportHeight
        ? currentY / (contentHeight - viewportHeight)
        : 0;

      // Detect active section
      if (sections.length > 0) {
        for (let i = sections.length - 1; i >= 0; i--) {
          const section = sections[i];
          if (currentY >= section.offsetY - 100) {
            if (activeSection.value !== section.id) {
              activeSection.value = section.id;
              runOnJS(handleSectionChange)(section.id);
            }
            break;
          }
        }
      }
    },
    onBeginDrag: () => {
      isScrolling.value = true;
    },
    onEndDrag: () => {
      // Smooth deceleration
      scrollVelocity.value = withSpring(0, animations.gentle);
    },
    onMomentumEnd: () => {
      isScrolling.value = false;
    },
  });

  return {
    scrollY,
    scrollVelocity,
    scrollHandler,
    activeSection,
    scrollProgress,
    isScrolling,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   useParallax Hook - Parallax Effects Based on Scroll
   ═══════════════════════════════════════════════════════════════════════════════ */

interface UseParallaxOptions {
  scrollY: SharedValue<number>;
  factor?: number; // 0.5 = slower, 2 = faster
  offset?: number;
}

export function useParallax({
  scrollY,
  factor = 0.5,
  offset = 0,
}: UseParallaxOptions) {
  const translateY = useDerivedValue(() => {
    return (scrollY.value - offset) * factor;
  });

  return { translateY };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   useFadeOnScroll Hook - Fade Elements Based on Scroll Position
   ═══════════════════════════════════════════════════════════════════════════════ */

interface UseFadeOnScrollOptions {
  scrollY: SharedValue<number>;
  inputRange: [number, number];
  outputRange?: [number, number];
}

export function useFadeOnScroll({
  scrollY,
  inputRange,
  outputRange = [1, 0],
}: UseFadeOnScrollOptions) {
  const opacity = useDerivedValue(() => {
    const [start, end] = inputRange;
    const [outStart, outEnd] = outputRange;
    
    if (scrollY.value <= start) return outStart;
    if (scrollY.value >= end) return outEnd;
    
    const progress = (scrollY.value - start) / (end - start);
    return outStart + (outEnd - outStart) * progress;
  });

  return { opacity };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   useTouchFeedback Hook - Press Animation with Haptics
   ═══════════════════════════════════════════════════════════════════════════════ */

interface UseTouchFeedbackOptions {
  scaleDown?: number;
  scaleUp?: number;
  hapticOnPress?: boolean;
  hapticOnRelease?: boolean;
}

export function useTouchFeedback({
  scaleDown = 0.95,
  scaleUp = 1.02,
  hapticOnPress = true,
  hapticOnRelease = true,
}: UseTouchFeedbackOptions = {}) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(false);

  const handlePressIn = useCallback(() => {
    'worklet';
    pressed.value = true;
    scale.value = withSpring(scaleDown, animations.snappy);
    if (hapticOnPress && Platform.OS !== 'web') {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scaleDown, hapticOnPress]);

  const handlePressOut = useCallback(() => {
    'worklet';
    pressed.value = false;
    scale.value = withSpring(scaleUp, animations.bouncy, () => {
      scale.value = withSpring(1, animations.spring);
    });
    if (hapticOnRelease && Platform.OS !== 'web') {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [scaleUp, hapticOnRelease]);

  return {
    scale,
    pressed,
    handlePressIn,
    handlePressOut,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   useScrollProgressBar Hook - For Scroll Indicator
   ═══════════════════════════════════════════════════════════════════════════════ */

export function useScrollProgressBar(scrollProgress: SharedValue<number>) {
  const width = useDerivedValue(() => {
    return `${Math.min(100, scrollProgress.value * 100)}%`;
  });

  return { width };
}

export default useNativeScroll;
