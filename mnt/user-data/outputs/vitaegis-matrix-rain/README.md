# VITAEGIS Matrix Rain

A sophisticated Matrix digital rain background component for Next.js, inspired by [Rezmason's Matrix](https://github.com/Rezmason/matrix) implementation. Built with Three.js and custom GLSL shaders.

![Vitaegis Matrix Rain](https://via.placeholder.com/1200x600/000000/00ff41?text=VITAEGIS+Matrix+Rain)

## ✨ Features

Based on key insights from Rezmason's award-winning implementation:

- **Authentic Sawtooth Wave Illumination** - Glyphs are stationary; only waves of illumination move
- **Multiple Non-Colliding Raindrops** - Per-column streams with variable speeds and lengths
- **GPU-Computed Particles** - High performance via fragment shaders
- **Advanced Bloom/Glow** - Post-processing with UnrealBloomPass
- **Authentic Glyph Cycling** - Matrix-style katakana and symbol characters
- **Color Mapping with Dithering** - Eliminates banding artifacts
- **Volumetric Depth Layers** - Optional 3D parallax effect
- **Interactive Ripple Effects** - Click to create operator-mode ripples
- **Intro Sequence** - Optional theatrical fade-in animation
- **CRT Effects** - Scanlines, chromatic aberration, vignette

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📦 Installation in Your Project

Copy the component files to your project:

```
components/
├── MatrixRain.tsx      # Basic version
└── MatrixRainPro.tsx   # Advanced version with all features
```

Install dependencies:

```bash
npm install three @types/three
```

## 🎮 Usage

### Basic Usage

```tsx
import MatrixRain from '@/components/MatrixRain';

export default function Page() {
  return (
    <div>
      <MatrixRain />
      {/* Your content */}
    </div>
  );
}
```

### Advanced Usage (Pro Version)

```tsx
import MatrixRainPro from '@/components/MatrixRainPro';

export default function Page() {
  return (
    <div>
      <MatrixRainPro
        columns={100}
        primaryColor="#00ff41"
        secondaryColor="#003311"
        backgroundColor="#000000"
        cursorColor="#ffffff"
        glintColor="#88ffaa"
        fallSpeed={0.8}
        cycleSpeed={0.4}
        trailLength={10}
        bloomStrength={0.6}
        bloomRadius={0.4}
        chromaticAberration={0.003}
        vignetteIntensity={0.35}
        depthLayers={2}
        depthFade={0.6}
        skipIntro={false}
        introDuration={4}
        onClick={(x, y) => console.log('Ripple at:', x, y)}
      />
      {/* Your content */}
    </div>
  );
}
```

## ⚙️ Props Reference

### MatrixRainPro Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number` | `80` | Number of columns in the grid |
| `primaryColor` | `string` | `#00ff41` | Main green color (bright glyphs) |
| `secondaryColor` | `string` | `#003311` | Dim trail color |
| `backgroundColor` | `string` | `#000000` | Background color |
| `cursorColor` | `string` | `#ffffff` | Raindrop tip (cursor) color |
| `glintColor` | `string` | `#88ffaa` | Random bright flash color |
| `fallSpeed` | `number` | `1.0` | Speed multiplier for rain |
| `cycleSpeed` | `number` | `0.5` | Speed of glyph cycling |
| `trailLength` | `number` | `8.0` | Length of raindrop trails |
| `slant` | `number` | `0` | Angle of rain in degrees |
| `cursorIntensity` | `number` | `2.0` | Brightness of cursor tip |
| `glintIntensity` | `number` | `0.5` | Brightness of random glints |
| `bloomStrength` | `number` | `0.5` | Glow effect intensity |
| `bloomRadius` | `number` | `0.3` | Glow spread radius |
| `bloomThreshold` | `number` | `0.2` | Minimum brightness for glow |
| `chromaticAberration` | `number` | `0.002` | RGB split effect strength |
| `vignetteIntensity` | `number` | `0.3` | Edge darkening strength |
| `ditherMagnitude` | `number` | `0.04` | Noise to hide color banding |
| `depthLayers` | `number` | `1` | Number of parallax layers (1-4) |
| `depthFade` | `number` | `0.5` | Opacity falloff for depth layers |
| `skipIntro` | `boolean` | `true` | Skip the theatrical intro |
| `introDuration` | `number` | `3.0` | Duration of intro in seconds |
| `opacity` | `number` | `1.0` | Overall effect opacity |
| `zIndex` | `number` | `-1` | CSS z-index for layering |
| `enabled` | `boolean` | `true` | Enable/disable the effect |
| `pixelRatio` | `number` | `auto` | Override device pixel ratio |
| `onReady` | `function` | - | Callback when effect is ready |
| `onClick` | `function` | - | Callback on click (enables ripples) |

## 🎨 Presets

### Classic Matrix (The Matrix, 1999)

```tsx
<MatrixRainPro
  primaryColor="#00ff41"
  fallSpeed={1.0}
  trailLength={8}
  bloomStrength={0.5}
/>
```

### Resurrections (The Matrix Resurrections, 2021)

```tsx
<MatrixRainPro
  primaryColor="#00ff00"
  cycleSpeed={0.3}
  trailLength={12}
  bloomStrength={0.7}
  bloomRadius={0.5}
/>
```

### Operator Mode

```tsx
<MatrixRainPro
  primaryColor="#00aa00"
  bloomStrength={0.3}
  depthLayers={1}
  vignetteIntensity={0}
  onClick={(x, y) => {/* ripple effect */}}
/>
```

### Nightmare Matrix

```tsx
<MatrixRainPro
  primaryColor="#ff0040"
  secondaryColor="#330011"
  cursorColor="#ff8888"
  fallSpeed={1.5}
  bloomStrength={0.8}
/>
```

### Paradise Matrix

```tsx
<MatrixRainPro
  primaryColor="#ffdd00"
  secondaryColor="#332200"
  cursorColor="#ffffff"
  fallSpeed={0.5}
  trailLength={15}
/>
```

## 🔧 Technical Details

### Architecture

Based on Rezmason's implementation, this effect uses:

1. **Sawtooth Wave Function** - The core algorithm. Glyphs don't move; brightness waves do.
2. **Per-Column Randomization** - Each column has unique speeds, lengths, and phases.
3. **Non-Colliding Streams** - Multiple raindrops per column, phase-offset to prevent overlap.
4. **Fragment Shader Computation** - All calculations happen on the GPU.
5. **Texture Atlas** - 8×8 grid of glyphs rendered to canvas texture.
6. **Post-Processing Pipeline** - Bloom → Chromatic Aberration → Vignette.

### Performance Tips

- Lower `columns` for better performance on mobile
- Reduce `depthLayers` to 1 for simpler effect
- Lower `pixelRatio` manually if needed
- Disable `chromaticAberration` if not needed

## 📚 Credits

- **Original Inspiration**: [Rezmason/matrix](https://github.com/Rezmason/matrix) - The definitive Matrix digital rain implementation
- **Featured in**: Vice Motherboard, with praise from Lilly Wachowski
- **Techniques**: Sawtooth wave illumination, MSDF glyph rendering, GPU particles

## 📄 License

MIT License - Feel free to use in your projects!

---

Built with 💚 for the VITAEGIS project

*Health • Stealth • Wealth*
