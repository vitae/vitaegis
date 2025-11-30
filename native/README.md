# VITAEGIS - React Native (Expo)

> Ancient Wisdom × Cyberpunk Technology | Health • Stealth • Wealth

A production-ready React Native app built with Expo SDK 52, featuring Instagram-level polish with physics-based animations, haptic feedback, and glassmorphic design.

## 🚀 Features

- **Expo Router** - File-based navigation with typed routes
- **Reanimated 3** - 60fps physics-based animations
- **NativeWind 4** - Tailwind CSS for React Native
- **Expo Haptics** - Native haptic feedback
- **React Native Skia** - GPU-accelerated Matrix rain effect
- **Glassmorphic UI** - BlurView + LinearGradient glass effects
- **Instagram Design System** - 4/8/12/16px spacing, 12/14/16/20px typography

## 📱 Components

| Component | Description |
|-----------|-------------|
| `GlassContainer` | Glassmorphic card with blur, glow variants |
| `BottomNav` | iOS-style tab bar with spring physics |
| `Skeleton` | Shimmer loading states |
| `HeroSection` | Animated hero with entrance sequence |
| `MatrixBackground` | GPU-accelerated Matrix rain |

## 🎨 Design Tokens

```typescript
// Colors
vitaeGreen: '#00ff00'
vitaeGreenGlow: 'rgba(0, 255, 65, 0.5)'
separator: 'rgba(255, 255, 255, 0.15)'

// Spacing (Instagram)
xs: 4, sm: 8, md: 12, lg: 16, xl: 20

// Typography (Instagram)
xs: 12, sm: 14, base: 16, lg: 20
```

## 🛠 Installation

```bash
# Clone and navigate
cd vitaegis-native

# Install dependencies
npm install

# Start Expo
npx expo start

# Run on iOS Simulator
npx expo start --ios

# Run on Android Emulator
npx expo start --android
```

## 📁 Project Structure

```
vitaegis-native/
├── app/
│   ├── _layout.tsx      # Root layout with providers
│   └── index.tsx        # Home screen
├── components/
│   ├── ui/
│   │   ├── BottomNav.tsx
│   │   ├── GlassContainer.tsx
│   │   └── Skeleton.tsx
│   ├── sections/
│   │   └── HeroSection.tsx
│   └── MatrixBackground.tsx
├── hooks/
│   └── useNativeScroll.ts
├── constants/
│   └── theme.ts
├── assets/
├── app.json
├── package.json
├── tailwind.config.js
├── metro.config.js
└── tsconfig.json
```

## 🎯 Hooks

### useNativeScroll
```typescript
const { scrollY, activeSection, scrollProgress } = useNativeScroll({
  sections: [...],
  onSectionChange: (id) => console.log(id),
  hapticFeedback: true,
});
```

### useTouchFeedback
```typescript
const { scale, handlePressIn, handlePressOut } = useTouchFeedback({
  scaleDown: 0.95,
  hapticOnPress: true,
});
```

## 🔧 Configuration

### NativeWind (tailwind.config.js)
Custom theme with Instagram spacing and Vitaegis colors.

### Babel (babel.config.js)
Configured for Reanimated and NativeWind.

### Metro (metro.config.js)
NativeWind CSS integration.

## 📦 Key Dependencies

- `expo` ~52.0.0
- `react-native-reanimated` ~3.16.1
- `nativewind` ^4.0.36
- `@shopify/react-native-skia` ^1.2.3
- `expo-blur` ~14.0.1
- `expo-haptics` ~14.0.0
- `expo-router` ~4.0.0

## 🏗 Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 📄 License

MIT © Vitaegis

---

*No SwiftUI. No Kotlin. Just React Native.*
