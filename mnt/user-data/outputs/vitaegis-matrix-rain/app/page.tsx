import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

// Dynamic import to avoid SSR issues with Three.js
const MatrixRainPro = dynamic(() => import('@/components/MatrixRainPro'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black z-[-1]" />
  ),
});

export const metadata: Metadata = {
  title: 'VITAEGIS | Health Stealth Wealth',
  description: 'Ancient wisdom meets cyberpunk technology. Zen, Kundalini, Tai Chi, Qi Gong - digitized for the modern seeker.',
};

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Matrix Rain Background */}
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
        opacity={1}
        zIndex={-1}
      />
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Logo/Brand */}
        <div className="text-center mb-12">
          <h1 
            className="text-6xl md:text-8xl font-light tracking-[0.3em] mb-4"
            style={{ 
              fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif',
              textShadow: '0 0 40px #00ff41, 0 0 80px #00ff4180, 0 0 120px #00ff4140',
            }}
          >
            <span className="text-[#00ff41]">VITAE</span>
            <span className="text-white">GIS</span>
          </h1>
          
          <p 
            className="text-sm md:text-base tracking-[0.5em] text-[#00ff41]/70 uppercase"
            style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}
          >
            Health • Stealth • Wealth
          </p>
        </div>
        
        {/* Tagline */}
        <div className="max-w-2xl text-center mb-16">
          <p 
            className="text-lg md:text-xl text-white/60 leading-relaxed"
            style={{ fontFamily: '"Futura Book", Futura, "Trebuchet MS", sans-serif' }}
          >
            Ancient wisdom digitized for the modern seeker.
            <br />
            <span className="text-[#00ff41]/80">Zen • Kundalini • Tai Chi • Qi Gong</span>
          </p>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            className="group relative px-8 py-4 border border-[#00ff41] bg-transparent 
                       hover:bg-[#00ff41]/10 transition-all duration-300
                       text-[#00ff41] tracking-widest text-sm uppercase"
            style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}
          >
            <span className="relative z-10">Enter the Dojo</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ boxShadow: 'inset 0 0 20px #00ff4140, 0 0 20px #00ff4140' }} />
          </button>
          
          <button
            className="group relative px-8 py-4 border border-white/30 bg-transparent 
                       hover:border-white/60 hover:bg-white/5 transition-all duration-300
                       text-white/70 hover:text-white tracking-widest text-sm uppercase"
            style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}
          >
            Connect Wallet
          </button>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[#00ff41]/40">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#00ff41]/40" />
          <span className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: 'monospace' }}>
            v0.1.0
          </span>
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#00ff41]/40" />
        </div>
      </div>
      
      {/* Scanline Overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-20 opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.1) 2px, rgba(0,255,65,0.1) 4px)',
        }}
      />
      
      {/* Corner Decorations */}
      <div className="fixed top-4 left-4 z-10">
        <svg width="40" height="40" viewBox="0 0 40 40" className="text-[#00ff41]/30">
          <path d="M0 20 L0 0 L20 0" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="fixed top-4 right-4 z-10">
        <svg width="40" height="40" viewBox="0 0 40 40" className="text-[#00ff41]/30">
          <path d="M40 20 L40 0 L20 0" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="fixed bottom-4 left-4 z-10">
        <svg width="40" height="40" viewBox="0 0 40 40" className="text-[#00ff41]/30">
          <path d="M0 20 L0 40 L20 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="fixed bottom-4 right-4 z-10">
        <svg width="40" height="40" viewBox="0 0 40 40" className="text-[#00ff41]/30">
          <path d="M40 20 L40 40 L20 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </main>
  );
}
