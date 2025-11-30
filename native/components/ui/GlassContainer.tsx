import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, spacing, shadows } from '@/constants/theme';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - GlassContainer Component (React Native)
   Glassmorphic Card with Instagram Spacing System
   ═══════════════════════════════════════════════════════════════════════════════ */

type Variant = 'default' | 'subtle' | 'prominent';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface GlassContainerProps {
  children: ReactNode;
  variant?: Variant;
  glow?: boolean;
  padding?: Padding;
  style?: ViewStyle;
  animated?: boolean;
}

const paddingValues: Record<Padding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
};

const variantStyles: Record<Variant, { bg: string; border: string }> = {
  default: {
    bg: 'rgba(0, 0, 0, 0.2)',
    border: 'rgba(255, 255, 255, 0.15)',
  },
  subtle: {
    bg: 'rgba(0, 0, 0, 0.1)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  prominent: {
    bg: 'rgba(0, 0, 0, 0.3)',
    border: 'rgba(0, 255, 65, 0.2)',
  },
};

export default function GlassContainer({
  children,
  variant = 'default',
  glow = false,
  padding = 'md',
  style,
  animated = false,
}: GlassContainerProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const variantConfig = variantStyles[variant];
  const paddingValue = paddingValues[padding];

  const Container = animated ? Animated.View : View;
  const containerStyle = animated
    ? [styles.container, animatedContainerStyle, style]
    : [styles.container, style];

  return (
    <Container style={containerStyle}>
      {/* Glass Background with Blur */}
      <BlurView
        intensity={40}
        tint="dark"
        style={[
          StyleSheet.absoluteFill,
          styles.blurContainer,
          {
            backgroundColor: variantConfig.bg,
            borderColor: variantConfig.border,
          },
        ]}
      />

      {/* Top Edge Glow Effect */}
      {glow && (
        <LinearGradient
          colors={['transparent', colors.vitaeGreenGlow, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.topGlow}
        />
      )}

      {/* Inner Glow for Prominent Variant */}
      {variant === 'prominent' && (
        <LinearGradient
          colors={['rgba(0, 255, 65, 0.05)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Content */}
      <View style={[styles.content, { padding: paddingValue }]}>
        {children}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  topGlow: {
    position: 'absolute',
    top: -1,
    left: '16.5%',
    right: '16.5%',
    height: 1,
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 10,
  },
});
