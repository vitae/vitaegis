# CLAUDE.md - AI Assistant Development Guide

## Project Overview

**Project Name**: Vitaegis
**Type**: Next.js Web Application
**Purpose**: A wellness and vitality platform combining traditional practices (Tai Chi, Yoga, Meditation) with a modern Matrix-themed Web3/crypto aesthetic.

## Technology Stack

### Core Framework
- **Next.js** 14.1.0 - React framework with file-based routing
- **React** 18.2.0 - UI library
- **Three.js** 0.157.0 - 3D graphics library for Matrix background effects
- **React Three Fiber** 8.15.0 - React renderer for Three.js
- **@react-three/drei** 9.92.0 - Helper components for R3F
- **@react-three/postprocessing** 2.16.0 - Post-processing effects (Bloom, Vignette)

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- Custom global styles in `/styles/globals.css`

### Development Tools
- **ESLint** 8.45.0 - Linting with Next.js configuration
- **Node.js** - Runtime environment

### Deployment
- **Vercel** - Primary hosting platform
- **GitHub** - Version control and CI/CD integration

## Project Structure

```
vitaegis/
├── pages/                    # Next.js pages (auto-routed)
│   ├── index.js             # Home page - Matrix Web3 theme
│   ├── matrix-demo.js       # Advanced Matrix Rain demo with R3F
│   ├── about.js             # About page
│   ├── contact.js           # Contact page
│   ├── yoga.js              # Yoga practice page
│   ├── taichi.js            # Tai Chi practice page
│   ├── meditation.js        # Meditation page
│   ├── products.js          # Products/services page
│   ├── live.js              # Live sessions page
│   └── information.js       # Information/resources page
│
├── components/              # Reusable React components
│   ├── Header.js           # Navigation header with links
│   ├── Footer.js           # Footer with copyright/BTC address
│   ├── MatrixBackground.js # Three.js animated Matrix effect (basic)
│   ├── MatrixRainR3F.js    # Advanced Matrix Rain with React Three Fiber
│   └── GlassmorphicNav.js  # Glassmorphic bottom navigation bar
│
├── styles/                  # Styling files
│   ├── globals.css         # Global styles (Futura font, body defaults)
│   └── tailwind.config.js  # Tailwind configuration (backup location)
│
├── .vercel/                # Vercel deployment configuration
├── deploy-vitaegis.sh      # Deployment script
├── deploy-vitaegis-clean.sh # Clean deployment script
├── tailwind.config.js      # Main Tailwind configuration
├── postcss.config.js       # PostCSS configuration
├── package.json            # Dependencies and scripts
└── .gitignore             # Git ignore patterns
```

## Design System & Conventions

### Color Palette
- **Primary Background**: `#000000` (Black)
- **Primary Text**: `#FFFFFF` (White)
- **Accent/Neon**: `#00FF00` (Bright Green) - Matrix theme
- **Secondary Background**: `#111111` (Dark gray for cards)

### Typography
- **Primary Font**: Futura Book, sans-serif
- **Font Family Config**: Available as Tailwind class `font-futura`
- **Heading Sizes**: Large headings typically use `text-4xl` (4rem)
- **Body Text**: Standard size with opacity variations for hierarchy

### Styling Approach
The codebase uses a **hybrid styling approach**:

1. **Tailwind Classes** - Preferred for layout and utilities
   ```jsx
   <div className="min-h-screen bg-black text-white">
   ```

2. **Inline Styles** - Used for component-specific styling
   ```jsx
   <h1 style={{ fontSize: "4rem", fontFamily: "Futura, sans-serif" }}>
   ```

3. **Custom Tailwind Extensions**:
   - `neon-text` - For neon green text
   - `border-neon` - For neon green borders
   - Custom color: `neon` = #00FF00

### Component Patterns

#### Page Structure
Standard page layout follows this pattern:
```jsx
import Header from "../components/Header";
import Footer from "../components/Footer";
import MatrixBackground from "../components/MatrixBackground";

export default function PageName() {
  return (
    <div className="min-h-screen bg-black text-white">
      <MatrixBackground />
      <Header />
      <main className="p-8">
        {/* Page content */}
      </main>
      <Footer />
    </div>
  );
}
```

#### MatrixBackground Component
- **IMPORTANT**: When importing MatrixBackground in pages (except index.js), use dynamic import with SSR disabled:
  ```jsx
  import dynamic from "next/dynamic";

  const MatrixBackground = dynamic(
    () => import("../components/MatrixBackground"),
    { ssr: false }
  );
  ```
- Reason: Three.js requires browser APIs not available during server-side rendering

#### Matrix Background Features
- 3D particle system using Three.js
- Animated "rain" effect with green particles
- Japanese characters and alphanumeric mix
- Absolute positioning with z-index management
- Responsive canvas sizing with resize handlers
- Proper cleanup in useEffect return

#### Advanced Matrix Rain (React Three Fiber)
The `MatrixRainR3F` component is an advanced implementation inspired by the [Rezmason Matrix project](https://github.com/Rezmason/matrix).

**Key Features**:
- **Fixed Grid System**: Glyphs remain stationary; illumination waves create falling effect
- **Sawtooth Wave Animation**: Controls raindrop rhythm and cursor positions
- **GPU-Accelerated**: Uses instanced meshes for rendering 4000+ glyphs at 60fps
- **Custom Shaders**: GLSL vertex and fragment shaders for per-instance rendering
- **Post-Processing**: Bloom and vignette effects for authentic phosphorescent glow
- **Authentic Characters**: Japanese katakana mixed with alphanumeric characters

**Technical Implementation**:
```jsx
// Always use dynamic import with SSR disabled
import dynamic from "next/dynamic";

const MatrixRainR3F = dynamic(() => import("../components/MatrixRainR3F"), {
  ssr: false,
});
```

**How It Works**:
1. Creates a fixed grid of 80 columns × 50 rows of glyphs
2. Each column has independent wave parameters (speed, phase, offset)
3. Sawtooth wave travels down each column, illuminating glyphs
4. Brightness varies based on distance from wave cursor
5. Bloom effect amplifies bright glyphs for glow
6. Random flickers add ambient variation

**Performance Optimizations**:
- InstancedMesh for efficient rendering of thousands of glyphs
- GPU computation in shaders instead of CPU
- Texture atlas for character glyphs
- Minimal state updates (only instance matrices and colors)

#### Glassmorphic Navigation
The `GlassmorphicNav` component provides a modern, translucent navigation bar:

**Features**:
- **Backdrop Filter**: 20px blur with 180% saturation
- **Transparency**: Shows Matrix Rain effect underneath
- **Neon Accents**: Green borders and shadows
- **Animated Scan Line**: Moving gradient effect across top
- **Responsive Design**: Icon-only on mobile, full labels on desktop
- **Hover Effects**: Glow and lift animations on interaction

**Styling**:
```jsx
backdropFilter: "blur(20px) saturate(180%)"
background: "rgba(0, 0, 0, 0.4)"
boxShadow: "0 -8px 32px 0 rgba(0, 255, 0, 0.15)"
```

### UI Elements

#### Buttons
Matrix-themed button style:
```jsx
<button
  style={{
    padding: "1rem 2rem",
    background: "#00ff00",
    color: "#000",
    fontSize: "1.2rem",
    fontWeight: "bold",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 0 20px #00ff00aa",
    transition: "transform 0.2s",
  }}
  onMouseEnter={(e) => (e.target.style.transform = "scale(1.08)")}
  onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
>
  Button Text
</button>
```

#### Feature Cards
```jsx
<div
  style={{
    padding: "2rem",
    background: "#111",
    borderRadius: "12px",
    border: "1px solid #00ff00",
    boxShadow: "0 0 15px #00ff0044",
  }}
>
  <h3 style={{ color: "#00ff00", marginBottom: "1rem" }}>Title</h3>
  <p style={{ opacity: 0.7 }}>Description</p>
</div>
```

## Development Workflow

### Available Scripts

```bash
# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Git Workflow

#### Current Branch Convention
- Feature branches: `claude/claude-md-mi0wr3xlsqcb18cn-018iJBfBb3JvJDko2s2wVfZ4`
- Main branch: Not specified (check with team)

#### Commit Message Style
Based on recent commits:
- Keep messages concise and lowercase
- Focus on the action: "fix taichi syntax error", "add public folder", "clean site"
- No specific convention enforced (conventional commits not required)

#### Deployment Process
1. **Push to GitHub**: Changes trigger automatic Vercel deployment
2. **Deployment Script**: Use `deploy-vitaegis.sh` or `deploy-vitaegis-clean.sh`
3. **Clean Deploy**: `deploy-vitaegis-clean.sh` reinitializes git history (use with caution)

### Code Quality Standards

#### ESLint
- Configuration: `eslint-config-next`
- Run linting before commits
- Fix linting errors automatically when possible

#### File Organization
- One component per file
- Named exports for components
- Default export for page components
- Keep components small and focused

## Common Patterns & Best Practices

### 1. Three.js Integration
- Always disable SSR for Three.js components using `dynamic` import
- Include proper cleanup in useEffect (dispose geometry, materials, renderer)
- Handle window resize events
- Use `useRef` for DOM mounting

### 2. Layout Components
- Use relative/absolute positioning with z-index for layering
- MatrixBackground typically at `z-index: -1`
- Content at `z-index: 10` or higher
- Full viewport height: `min-h-screen` or `height: 100vh`

### 3. Navigation
- Next.js `<Link>` component for internal navigation
- All major pages accessible from Header component
- Consistent navigation across all pages

### 4. Responsive Design
- Mobile-first approach with Tailwind
- Grid layouts: `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))`
- Flexible spacing and padding
- Responsive font sizes

### 5. Performance Considerations
- Dynamic imports for heavy components (Three.js)
- SSR disabled where necessary
- Proper resource disposal
- Optimized particle counts (2000 particles for Matrix effect)

## Key Files Reference

### Configuration Files
- `package.json:5-9` - Build scripts and dev commands
- `tailwind.config.js:3-8` - Custom theme extensions (neon color, Futura font)
- `postcss.config.js` - PostCSS configuration for Tailwind
- `.gitignore:1-25` - Ignore patterns for node_modules, .next, build output

### Core Components
- `components/MatrixBackground.js:8-98` - Three.js setup and animation logic
- `components/Header.js:3-20` - Site navigation structure
- `components/Footer.js:1-8` - Footer with BTC address

### Example Pages
- `pages/index.js:4-123` - Home page with feature grid pattern
- `pages/taichi.js:1-21` - Dynamic import pattern for MatrixBackground
- `pages/about.js:1-17` - Standard page layout pattern

## AI Assistant Guidelines

### When Making Changes

1. **Preserve the Aesthetic**: Maintain the Matrix/Web3/neon green cyberpunk theme
2. **Consistency**: Follow existing patterns for new pages/components
3. **Three.js Components**: Always use dynamic imports with SSR disabled
4. **Styling**: Use hybrid approach (Tailwind + inline styles) as existing code does
5. **Testing**: Test with `npm run dev` before building
6. **Linting**: Run `npm run lint` to catch issues

### When Adding New Features

1. **New Pages**: Follow the standard page structure pattern
2. **New Components**: Place in `/components` directory
3. **Styling**: Extend Tailwind config for reusable styles
4. **Three.js**: Ensure proper cleanup and resize handling
5. **Navigation**: Update Header.js if adding new routes

### Common Tasks

#### Adding a New Page
```jsx
// 1. Create file in /pages directory
// 2. Use this template:
import dynamic from "next/dynamic";
import Header from "../components/Header";
import Footer from "../components/Footer";

const MatrixBackground = dynamic(
  () => import("../components/MatrixBackground"),
  { ssr: false }
);

export default function NewPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <MatrixBackground />
      <Header />
      <main className="p-8 relative z-10">
        <h1 className="text-4xl neon-text">Page Title</h1>
        {/* Content */}
      </main>
      <Footer />
    </div>
  );
}
```

#### Creating a Feature Card Section
```jsx
<section
  style={{
    display: "grid",
    gap: "2rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    maxWidth: "1000px",
    margin: "0 auto",
  }}
>
  {/* Add cards here */}
</section>
```

### Debugging Tips

1. **Three.js Issues**: Check browser console for WebGL errors
2. **SSR Errors**: Ensure Three.js components use dynamic imports
3. **Styling Issues**: Verify Tailwind classes are in configured content paths
4. **Build Errors**: Check for syntax errors, missing imports
5. **Deployment Issues**: Review Vercel build logs

## Project Context

### Theme & Branding
- **Vitaegis Vitality**: Focus on wellness and vitality
- **Matrix Aesthetic**: Cyberpunk/Web3 visual theme
- **Practices**: Traditional wellness (Tai Chi, Yoga, Meditation) meets modern tech
- **Web3 Integration**: References to crypto payments, blockchain, smart contracts

### Target Features (from home page)
- Crypto payment acceptance (ETH, SOL, USDC)
- Digital products and services
- Smart contract integration
- Live sessions
- Information resources

### Future Considerations
- May need wallet integration for crypto features
- Live streaming functionality for sessions
- E-commerce capabilities for products
- User authentication/accounts
- Content management system

## Troubleshooting

### Common Issues

1. **"window is not defined"**: Use dynamic import with `ssr: false`
2. **Tailwind classes not working**: Check `tailwind.config.js` content paths
3. **Three.js memory leaks**: Ensure proper disposal in useEffect cleanup
4. **Vercel deployment fails**: Check build logs, verify Next.js version compatibility

### Dependencies
All dependencies are locked in `package-lock.json`. To update:
```bash
npm update
```

To install fresh:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Additional Notes

- No README.md exists currently - consider creating one for public documentation
- Deploy scripts assume SSH git access (git@github.com)
- BTC address in footer: `v1t43g1s333v1743zyy808bc1` (verify if legitimate)
- Font loading from Google Fonts (Futura family)
- No public assets folder visible (may need to create for images/icons)

---

**Last Updated**: 2025-11-15
**Document Version**: 1.0
**Target AI Assistants**: Claude, GPT-4, and other LLM development assistants
