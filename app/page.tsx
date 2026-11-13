import MatrixRainLazy from '@/components/MatrixRainLazy';
import HeroSection from '@/components/sections/HeroSection';
import AboutSection from '@/components/sections/AboutSection';
import PracticesSection from '@/components/sections/PracticesSection';
import ProjectsSection from '@/components/sections/ProjectsSection';
import TokenSection from '@/components/sections/TokenSection';
import CommunitySection from '@/components/sections/CommunitySection';
import Footer from '@/components/Footer';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Home
   Server-rendered. Only the rain, the live check, the buy buttons and the subscribe
   form ship JavaScript; scroll reveals and the progress bar are CSS scroll timelines.
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <div className="app-shell mx-auto flex min-h-screen w-full min-w-0 max-w-6xl flex-col items-center px-4 sm:px-6">
      <MatrixRainLazy />
      <div className="scroll-progress" aria-hidden />

      <main className="app-content relative z-10 flex w-full flex-col items-center">
        <HeroSection />
        <AboutSection />
        <PracticesSection />
        <ProjectsSection />
        <TokenSection />
        <CommunitySection />
        <Footer />
      </main>
    </div>
  );
}
