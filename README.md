# VITAEGIS - Web3 Matrix Portal

![Matrix Web3](https://img.shields.io/badge/Web3-Matrix-00ff41?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-red?style=for-the-badge&logo=three.js)

A cutting-edge Web3 platform featuring an immersive 3D Matrix Rain background built with Next.js, React Three Fiber, and advanced WebGL shaders.

## Features

- **3D Matrix Rain Background**: GPU-accelerated particle system with custom GLSL shaders
- **React Three Fiber**: Professional-grade Three.js integration with React
- **Post-Processing Effects**: Bloom, chromatic aberration, and advanced visual effects
- **Framer Motion**: Smooth, performant animations throughout
- **Responsive Design**: Optimized for all devices
- **Web3 Ready**: Built for decentralized applications

## Tech Stack

- **Next.js 14** - React framework with optimized performance
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **@react-three/postprocessing** - Post-processing effects
- **Framer Motion** - Animation library
- **Tailwind CSS** - Utility-first CSS framework
- **Three.js** - 3D graphics library

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Project Structure

```
vitaegis/
├── components/
│   ├── MatrixRain.js          # GPU-accelerated particle system
│   ├── MatrixBackground3D.js  # Main 3D canvas component
│   └── Layout.js              # Site layout with nav/footer
├── pages/
│   ├── _app.js               # App wrapper
│   └── index.js              # Home page
├── styles/
│   └── globals.css           # Global styles with Tailwind
├── public/                   # Static assets
└── next.config.js           # Next.js configuration
```

## Performance Optimizations

- **GPU Acceleration**: All particle computations run on GPU via GLSL shaders
- **Dynamic Imports**: 3D components load client-side only
- **Code Splitting**: Automatic chunking for optimal load times
- **Image Optimization**: Next.js Image component with AVIF/WebP
- **React Suspense**: Smooth loading states
- **Production Minification**: SWC compiler for fast builds

## Deployment

### Vercel (Recommended)

This project is optimized for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Environment Variables

No environment variables required for basic deployment.

## Customization

### Matrix Colors

Edit `components/MatrixRain.js`:

```javascript
color1: { value: new THREE.Color('#00ff41') }, // Bright green
color2: { value: new THREE.Color('#003B00') }, // Dark green
```

### Particle Count

Adjust performance by changing particle count in `components/MatrixBackground3D.js`:

```javascript
<MatrixRain count={5000} /> // Reduce for better performance on slower devices
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires WebGL 2.0 support for optimal performance.

## License

MIT License - feel free to use this project for your own Web3 applications!

## Credits

Inspired by the iconic Matrix digital rain effect and the [Rezmason/matrix](https://github.com/Rezmason/matrix) project.

Built with React Three Fiber by [Poimandres](https://github.com/pmndrs).

---

**Enter the Matrix of Web3** 🟢
