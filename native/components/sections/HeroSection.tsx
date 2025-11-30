import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassContainer from '@/components/ui/GlassContainer';
import { colors, typography, spacing, animations, radii } from '@/constants/theme';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - HeroSection Component (React Native)
   Full-Screen Hero with Entrance Animations
   ═══════════════════════════════════════════════════════════════════════════════ */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HeroSectionProps {
  onScrollDown?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HeroSection({ onScrollDown }: HeroSectionProps) {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(0);
  const scrollIndicatorOpacity = useSharedValue(0);
  const scrollIndicatorY = useSharedValue(0);

  // Initial entrance animations
  useEffect(() => {
    // Sequence the animations
    logoScale.value = withDelay(200, withSpring(1, animations.bouncy));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    
    titleTranslateY.value = withDelay(400, withSpring(0, animations.spring));
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    taglineOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    
    buttonScale.value = withDelay(1000, withSpring(1, animations.bouncy));
    buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
    
    scrollIndicatorOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    
    // Continuous bounce animation for scroll indicator
    scrollIndicatorY.value = withDelay(
      1500,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: buttonOpacity.value,
  }));

  const scrollIndicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollIndicatorY.value }],
    opacity: scrollIndicatorOpacity.value,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <GlassContainer variant="prominent" glow padding="lg">
            <View style={styles.logoInner}>
              <Text style={styles.logoSymbol}>⬡</Text>
              <View style={styles.logoGlow} />
            </View>
          </GlassContainer>
        </Animated.View>

        {/* Title */}
        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          VITAEGIS
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
          Ancient Wisdom × Cyberpunk Technology
        </Animated.Text>

        {/* Tagline Pills */}
        <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Health</Text>
          </View>
          <View style={styles.pillDivider}>
            <Text style={styles.pillDividerText}>•</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Stealth</Text>
          </View>
          <View style={styles.pillDivider}>
            <Text style={styles.pillDividerText}>•</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Wealth</Text>
          </View>
        </Animated.View>

        {/* CTA Button */}
        <AnimatedPressable
          style={[styles.ctaButton, buttonAnimatedStyle]}
          onPress={onScrollDown}
        >
          <LinearGradient
            colors={[colors.vitaeGreen, colors.vitaeGreenDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>EXPLORE</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      {/* Scroll Indicator */}
      <Animated.View
        style={[styles.scrollIndicator, scrollIndicatorAnimatedStyle]}
      >
        <Pressable onPress={onScrollDown}>
          <View style={styles.scrollIconContainer}>
            <View style={styles.scrollIcon}>
              <View style={styles.scrollIconDot} />
            </View>
            <Text style={styles.scrollText}>Scroll to explore</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoInner: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoSymbol: {
    fontSize: 48,
    color: colors.vitaeGreen,
    textShadowColor: colors.vitaeGreenGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.vitaeGreenGlow,
    opacity: 0.3,
  },
  title: {
    fontSize: typography['4xl'].fontSize,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sm.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    letterSpacing: 2,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: {
    fontSize: typography.xs.fontSize,
    color: colors.vitaeGreen,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pillDivider: {
    paddingHorizontal: spacing.sm,
  },
  pillDividerText: {
    color: colors.text.tertiary,
    fontSize: 8,
  },
  ctaButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.vitaeGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  ctaGradient: {
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
  },
  ctaText: {
    fontSize: typography.base.fontSize,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: 3,
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  scrollIconContainer: {
    alignItems: 'center',
  },
  scrollIcon: {
    width: 24,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
  },
  scrollIconDot: {
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.vitaeGreen,
  },
  scrollText: {
    marginTop: spacing.sm,
    fontSize: typography.xs.fontSize,
    color: colors.text.disabled,
    letterSpacing: 1,
  },
});
