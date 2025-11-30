import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, tabBar, animations, spacing } from '@/constants/theme';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - BottomNav Component (React Native)
   Instagram-Level Tab Bar with Physics Animations & Haptics
   ═══════════════════════════════════════════════════════════════════════════════ */

type IconName = keyof typeof Ionicons.glyphMap;

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'HOME', icon: 'home' },
  { id: 'about', label: 'ABOUT', icon: 'information-circle' },
  { id: 'practices', label: 'LIVE', icon: 'videocam' },
  { id: 'token', label: 'STORE', icon: 'bag' },
  { id: 'community', label: 'CONNECT', icon: 'people' },
];

interface BottomNavProps {
  activeSection?: string;
  onNavigate?: (id: string) => void;
}

// Individual Tab Item Component
function TabItem({
  item,
  isActive,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const lastTapRef = useRef<number>(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.85, { duration: 100 });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handlePressOut = useCallback(() => {
    // Prevent double-tap
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      scale.value = withSpring(1, animations.spring);
      return;
    }
    lastTapRef.current = now;

    // Bounce animation
    scale.value = withSpring(1.1, animations.bouncy, () => {
      scale.value = withSpring(1, animations.spring);
    });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {/* Icon */}
        <Ionicons
          name={item.icon}
          size={tabBar.iconSize}
          color={isActive ? colors.vitaeGreen : colors.text.tertiary}
          style={isActive ? styles.activeIcon : undefined}
        />

        {/* Label */}
        <Text
          style={[
            styles.tabLabel,
            { color: isActive ? colors.vitaeGreen : colors.text.disabled },
          ]}
        >
          {item.label}
        </Text>

        {/* Active Indicator Dot */}
        {isActive && <View style={styles.activeDot} />}
      </Animated.View>
    </Pressable>
  );
}

export default function BottomNav({
  activeSection = 'home',
  onNavigate,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();

  const handleNavigate = useCallback(
    (id: string) => {
      onNavigate?.(id);
    },
    [onNavigate]
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Glass Background */}
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.glassOverlay} />
      </BlurView>

      {/* Top Separator */}
      <View style={styles.separator} />

      {/* Tab Items */}
      <View style={styles.tabContainer}>
        {navItems.map((item) => (
          <TabItem
            key={item.id}
            item={item}
            isActive={activeSection === item.id}
            onPress={() => handleNavigate(item.id)}
          />
        ))}
      </View>

      {/* Ambient Underglow */}
      <View style={styles.underglow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  separator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.separator,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: tabBar.height,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: tabBar.labelSize,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  activeIcon: {
    // Glow effect via shadow
    ...Platform.select({
      ios: {
        shadowColor: colors.vitaeGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.vitaeGreen,
    ...Platform.select({
      ios: {
        shadowColor: colors.vitaeGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  underglow: {
    position: 'absolute',
    bottom: -16,
    left: '12.5%',
    right: '12.5%',
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.vitaeGreenLight,
    opacity: 0.5,
  },
});
