import React, { useMemo, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Text as SkiaText,
  useFont,
  Group,
  Blur,
  Fill,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useDerivedValue,
  useFrameCallback,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - MatrixBackground Component (React Native + Skia)
   High-Performance GPU-Accelerated Matrix Rain Effect
   ═══════════════════════════════════════════════════════════════════════════════ */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Matrix character set (Japanese Katakana + Latin + Numbers)
const MATRIX_CHARS = 
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';

// Configuration
const FONT_SIZE = 16;
const COLUMN_WIDTH = FONT_SIZE;
const NUM_COLUMNS = Math.ceil(SCREEN_WIDTH / COLUMN_WIDTH);
const NUM_ROWS = Math.ceil(SCREEN_HEIGHT / FONT_SIZE) + 5;

// Generate random character
const getRandomChar = () =>
  MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

// Column data structure
interface MatrixColumn {
  x: number;
  chars: string[];
  speed: number;
  offset: number;
  brightness: number[];
}

// Generate initial columns
const generateColumns = (): MatrixColumn[] =>
  Array.from({ length: NUM_COLUMNS }, (_, i) => ({
    x: i * COLUMN_WIDTH,
    chars: Array.from({ length: NUM_ROWS }, () => getRandomChar()),
    speed: 0.5 + Math.random() * 1.5,
    offset: Math.random() * SCREEN_HEIGHT,
    brightness: Array.from({ length: NUM_ROWS }, (_, j) =>
      // Fade from top (dim) to bottom (bright) with some variance
      Math.max(0, Math.min(1, (j / NUM_ROWS) * 1.2 + (Math.random() * 0.3 - 0.15)))
    ),
  }));

interface MatrixBackgroundProps {
  intensity?: number;
  blur?: number;
}

// Fallback component for when Skia isn't available
function MatrixFallback() {
  return (
    <View style={styles.fallback}>
      <View style={styles.fallbackGradient} />
    </View>
  );
}

export default function MatrixBackground({
  intensity = 1,
  blur = 0,
}: MatrixBackgroundProps) {
  const columns = useMemo(() => generateColumns(), []);
  const time = useSharedValue(0);
  
  // Animation frame callback for smooth updates
  useFrameCallback((frameInfo) => {
    time.value = (frameInfo.timestamp / 1000) % 1000;
  });

  // Memoized column positions derived from time
  const columnOffsets = useDerivedValue(() =>
    columns.map((col) => ({
      ...col,
      currentOffset: (col.offset + time.value * col.speed * 50) % (SCREEN_HEIGHT + FONT_SIZE * 5),
    }))
  );

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Background fill */}
        <Fill color={colors.black} />

        {/* Matrix columns */}
        <Group opacity={intensity}>
          {columns.map((column, colIndex) => (
            <Group key={colIndex}>
              {column.chars.map((char, charIndex) => {
                const y = charIndex * FONT_SIZE;
                const brightness = column.brightness[charIndex];
                const isHead = charIndex === column.chars.length - 1;
                
                return (
                  <SkiaText
                    key={`${colIndex}-${charIndex}`}
                    x={column.x}
                    y={y}
                    text={char}
                    color={
                      isHead
                        ? colors.white // Head character is white
                        : `rgba(0, 255, 0, ${brightness * 0.8})`
                    }
                    font={null} // Will use default font
                  />
                );
              })}
            </Group>
          ))}
        </Group>

        {/* Blur effect if needed */}
        {blur > 0 && <Blur blur={blur} />}

        {/* Bottom fade gradient */}
        <Fill>
          <LinearGradient
            start={vec(0, SCREEN_HEIGHT * 0.7)}
            end={vec(0, SCREEN_HEIGHT)}
            colors={['transparent', colors.black]}
          />
        </Fill>
      </Canvas>

      {/* Scan line overlay */}
      <View style={styles.scanLines} pointerEvents="none" />
    </View>
  );
}

// Simplified fallback without Skia (CSS-based)
export function MatrixBackgroundSimple({ opacity = 0.3 }: { opacity?: number }) {
  const animation = useSharedValue(0);

  useEffect(() => {
    animation.value = withRepeat(
      withTiming(1, { duration: 20000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animation.value * 100 }],
  }));

  return (
    <View style={[styles.container, { opacity }]}>
      <Animated.View style={[styles.simpleRain, animatedStyle]}>
        {Array.from({ length: 50 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.rainDrop,
              {
                left: `${(i / 50) * 100}%`,
                height: 50 + Math.random() * 100,
                opacity: 0.3 + Math.random() * 0.7,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  scanLines: {
    ...StyleSheet.absoluteFillObject,
    // Creates subtle scan line effect
    backgroundColor: 'transparent',
    // This would ideally be a repeating gradient pattern
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
  },
  fallbackGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  simpleRain: {
    ...StyleSheet.absoluteFillObject,
  },
  rainDrop: {
    position: 'absolute',
    width: 2,
    backgroundColor: colors.vitaeGreen,
    opacity: 0.5,
  },
});
