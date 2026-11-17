import MatrixRainLazy from '@/components/MatrixRainLazy';
import HeroSection from '@/components/sections/HeroSection';
import AboutSection from '@/components/sections/AboutSection';
import LiveStream from '@/components/LiveStream';
import TokenSection from '@/components/sections/TokenSection';
import ProjectsSection from '@/components/sections/ProjectsSection';
import CommunitySection from '@/components/sections/CommunitySection';
import Footer from '@/components/Footer';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Home
   Who this is, what it means, what to buy, where to follow. The live stream joins
   them only while the channel is on air.
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <div className="app-shell mx-auto flex min-h-screen w-full min-w-0 max-w-6xl flex-col items-center px-4 sm:px-6">
      <MatrixRainLazy />
      <div className="scroll-progress" aria-hidden />

      <main className="app-content relative z-10 flex w-full flex-col items-center">
        <HeroSection />
        <AboutSection />
        <LiveStream />
        <TokenSection />
        <ProjectsSection />
        <CommunitySection />
        <Footer />
      </main>
    </div>
  );
}
