import React, { useCallback, useRef, useState, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  scrollTo,
  runOnUI,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import { MatrixBackgroundSimple } from '@/components/MatrixBackground';
import BottomNav from '@/components/ui/BottomNav';
import GlassContainer from '@/components/ui/GlassContainer';
import HeroSection from '@/components/sections/HeroSection';
import { SkeletonHero, SkeletonPracticeCard } from '@/components/ui/Skeleton';

// Hooks
import { useNativeScroll, SectionInfo } from '@/hooks/useNativeScroll';

// Constants
import { colors, spacing, typography, radii, practices, tabBar } from '@/constants/theme';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Home Screen (React Native)
   Main App Experience with All Sections
   ═══════════════════════════════════════════════════════════════════════════════ */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<ScrollView>();
  const [isLoading, setIsLoading] = useState(false);

  // Section refs and positions
  const sectionPositions = useRef<Record<string, number>>({
    home: 0,
    about: SCREEN_HEIGHT,
    practices: SCREEN_HEIGHT * 2,
    token: SCREEN_HEIGHT * 3,
    community: SCREEN_HEIGHT * 4,
  });

  // Sections config
  const sections: SectionInfo[] = [
    { id: 'home', offsetY: 0, height: SCREEN_HEIGHT },
    { id: 'about', offsetY: SCREEN_HEIGHT, height: SCREEN_HEIGHT * 0.8 },
    { id: 'practices', offsetY: SCREEN_HEIGHT * 1.8, height: SCREEN_HEIGHT },
    { id: 'token', offsetY: SCREEN_HEIGHT * 2.8, height: SCREEN_HEIGHT * 0.8 },
    { id: 'community', offsetY: SCREEN_HEIGHT * 3.6, height: SCREEN_HEIGHT * 0.8 },
  ];

  // Native scroll hook
  const {
    scrollY,
    scrollHandler,
    activeSection,
    scrollProgress,
    isScrolling,
  } = useNativeScroll({
    sections,
    onSectionChange: (sectionId) => {
      console.log('Active section:', sectionId);
    },
  });

  // Navigate to section
  const handleNavigate = useCallback((sectionId: string) => {
    const position = sectionPositions.current[sectionId] ?? 0;
    scrollRef.current?.scrollTo({ y: position, animated: true });
  }, []);

  // Scroll progress bar style
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, scrollProgress.value * 100)}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Matrix Background */}
      <MatrixBackgroundSimple opacity={0.2} />

      {/* Scroll Progress Bar */}
      <View style={[styles.progressBarContainer, { top: insets.top }]}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>

      {/* Main Scrollable Content */}
      <AnimatedScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBar.height + insets.bottom },
        ]}
        decelerationRate="fast"
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
      >
        {/* Hero Section */}
        <View
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current.home = e.nativeEvent.layout.y;
          }}
        >
          <HeroSection onScrollDown={() => handleNavigate('about')} />
        </View>

        {/* About Section */}
        <View
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current.about = e.nativeEvent.layout.y;
          }}
        >
          <AboutSection />
        </View>

        {/* Practices Section */}
        <View
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current.practices = e.nativeEvent.layout.y;
          }}
        >
          <PracticesSection />
        </View>

        {/* Token Section */}
        <View
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current.token = e.nativeEvent.layout.y;
          }}
        >
          <TokenSection />
        </View>

        {/* Community Section */}
        <View
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current.community = e.nativeEvent.layout.y;
          }}
        >
          <CommunitySection />
        </View>
      </AnimatedScrollView>

      {/* Bottom Navigation */}
      <BottomNav
        activeSection={activeSection.value}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Section Components
   ═══════════════════════════════════════════════════════════════════════════════ */

function AboutSection() {
  return (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>ABOUT</Text>
      <Text style={styles.sectionSubtitle}>Our Mission</Text>
      
      <GlassContainer variant="default" glow padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Ancient Wisdom Meets Modern Tech</Text>
        <Text style={styles.cardText}>
          VITAEGIS bridges millennia-old wellness practices with cutting-edge 
          blockchain technology, creating a holistic ecosystem for health, 
          privacy, and prosperity.
        </Text>
      </GlassContainer>

      <View style={styles.statsRow}>
        <GlassContainer variant="subtle" padding="md" style={styles.statCard}>
          <Text style={styles.statNumber}>4</Text>
          <Text style={styles.statLabel}>Practices</Text>
        </GlassContainer>
        <GlassContainer variant="subtle" padding="md" style={styles.statCard}>
          <Text style={styles.statNumber}>∞</Text>
          <Text style={styles.statLabel}>Potential</Text>
        </GlassContainer>
        <GlassContainer variant="subtle" padding="md" style={styles.statCard}>
          <Text style={styles.statNumber}>1</Text>
          <Text style={styles.statLabel}>Vision</Text>
        </GlassContainer>
      </View>
    </View>
  );
}

function PracticesSection() {
  return (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>PRACTICES</Text>
      <Text style={styles.sectionSubtitle}>Ancient Disciplines</Text>

      {practices.map((practice, index) => (
        <PracticeCard key={practice.id} practice={practice} index={index} />
      ))}
    </View>
  );
}

function PracticeCard({
  practice,
  index,
}: {
  practice: (typeof practices)[number];
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
      >
        <GlassContainer
          variant="default"
          padding="md"
          style={styles.practiceCard}
        >
          <View style={styles.practiceRow}>
            <View
              style={[
                styles.practiceIcon,
                { backgroundColor: `${practice.color}20` },
              ]}
            >
              <Text style={styles.practiceEmoji}>{practice.icon}</Text>
            </View>
            <View style={styles.practiceInfo}>
              <View style={styles.practiceHeader}>
                <Text style={styles.practiceName}>{practice.name}</Text>
                <Text style={[styles.practiceSubtitle, { color: practice.color }]}>
                  {practice.subtitle}
                </Text>
              </View>
              <Text style={styles.practiceDescription}>
                {practice.description}
              </Text>
            </View>
          </View>
        </GlassContainer>
      </Pressable>
    </Animated.View>
  );
}

function TokenSection() {
  return (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>TOKEN</Text>
      <Text style={styles.sectionSubtitle}>$VTGIS</Text>

      <GlassContainer variant="prominent" glow padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Utility Token</Text>
        <Text style={styles.cardText}>
          The VTGIS token powers the Vitaegis ecosystem, enabling access to 
          premium content, governance voting, and staking rewards.
        </Text>
        
        <Pressable style={styles.tokenButton}>
          <Text style={styles.tokenButtonText}>Coming Soon</Text>
        </Pressable>
      </GlassContainer>
    </View>
  );
}

function CommunitySection() {
  return (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>COMMUNITY</Text>
      <Text style={styles.sectionSubtitle}>Join the Movement</Text>

      <GlassContainer variant="default" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Connect With Us</Text>
        <Text style={styles.cardText}>
          Join our growing community of wellness enthusiasts and crypto 
          pioneers. Together, we're building the future of holistic health.
        </Text>

        <View style={styles.socialRow}>
          {['Discord', 'Twitter', 'Telegram'].map((platform) => (
            <Pressable key={platform} style={styles.socialButton}>
              <Text style={styles.socialButtonText}>{platform}</Text>
            </Pressable>
          ))}
        </View>
      </GlassContainer>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.vitaeGreen,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    minHeight: SCREEN_HEIGHT * 0.8,
  },
  sectionContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
  sectionTitle: {
    fontSize: typography['2xl'].fontSize,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 4,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.sm.fontSize,
    color: colors.vitaeGreen,
    letterSpacing: 2,
    marginBottom: spacing['2xl'],
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.lg.fontSize,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  cardText: {
    fontSize: typography.base.fontSize,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography['2xl'].fontSize,
    fontWeight: '700',
    color: colors.vitaeGreen,
  },
  statLabel: {
    fontSize: typography.xs.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  practiceCard: {
    marginBottom: spacing.md,
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  practiceIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  practiceEmoji: {
    fontSize: 28,
  },
  practiceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  practiceName: {
    fontSize: typography.base.fontSize,
    fontWeight: '600',
    color: colors.white,
    marginRight: spacing.sm,
  },
  practiceSubtitle: {
    fontSize: typography.sm.fontSize,
  },
  practiceDescription: {
    fontSize: typography.sm.fontSize,
    color: colors.text.tertiary,
  },
  tokenButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.vitaeGreen,
    alignSelf: 'flex-start',
  },
  tokenButtonText: {
    color: colors.vitaeGreen,
    fontWeight: '600',
    letterSpacing: 2,
  },
  socialRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  socialButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.md,
    alignItems: 'center',
  },
  socialButtonText: {
    color: colors.text.secondary,
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
  },
});
