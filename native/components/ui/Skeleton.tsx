import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { radii, colors } from '@/constants/theme';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Skeleton Component (React Native)
   Shimmer Loading States for Optimistic UI
   ═══════════════════════════════════════════════════════════════════════════════ */

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radii.md,
  style,
}: SkeletonProps) {
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      false // don't reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmerProgress.value,
          [0, 1],
          [-200, 200]
        ),
      },
    ],
  }));

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.1)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

// Preset Skeleton Variants
export function SkeletonText({
  lines = 1,
  style,
}: {
  lines?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
          style={i > 0 ? { marginTop: 8 } : undefined}
        />
      ))}
    </View>
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton height={120} borderRadius={radii.lg} />
      <View style={styles.cardContent}>
        <Skeleton height={20} width="70%" style={{ marginBottom: 8 }} />
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="85%" style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonAvatar({
  size = 48,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

export function SkeletonButton({
  width = 120,
  height = 44,
  style,
}: {
  width?: number;
  height?: number;
  style?: ViewStyle;
}) {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={radii.lg}
      style={style}
    />
  );
}

// Hero Section Skeleton
export function SkeletonHero() {
  return (
    <View style={styles.hero}>
      <Skeleton width={120} height={120} borderRadius={60} />
      <Skeleton width="60%" height={36} style={{ marginTop: 24 }} />
      <Skeleton width="40%" height={20} style={{ marginTop: 12 }} />
      <SkeletonText lines={3} style={{ marginTop: 24, width: '80%' }} />
      <SkeletonButton width={180} height={48} style={{ marginTop: 32 }} />
    </View>
  );
}

// Practice Card Skeleton
export function SkeletonPracticeCard() {
  return (
    <View style={styles.practiceCard}>
      <Skeleton width={64} height={64} borderRadius={radii.lg} />
      <View style={styles.practiceContent}>
        <Skeleton width="50%" height={18} />
        <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    width: 200,
    height: '100%',
  },
  textContainer: {
    width: '100%',
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 12,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  practiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.lg,
    marginBottom: 12,
  },
  practiceContent: {
    flex: 1,
    marginLeft: 16,
  },
});

export default Skeleton;
