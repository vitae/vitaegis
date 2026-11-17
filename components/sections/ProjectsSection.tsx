import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';
import { projects } from '@/components/projects';

const HOME_PROJECTS = ['/travel', '/stocks', '/vitamins'];

export default function ProjectsSection() {
  const shown = HOME_PROJECTS.map((href) => projects.find((p) => p.href === href)).filter(
    (p) => p !== undefined,
  );

  return (
    <section
      id="projects"
      className="relative flex flex-col items-center py-10 text-center sm:py-14"
    >
      <div className="section-container min-w-0">
        <SectionTitle>Projects</SectionTitle>
        <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {shown.map((project) => {
            const Icon = project.icon;
            return (
              <GlassContainer
                key={project.href}
                variant="default"
                glow
                lit
                padding="md"
                className="reveal flex h-full flex-col text-center"
              >
                <div className="flex h-full w-full flex-col items-center gap-3">
                  <Icon size={32} className="text-vitae-green" />
                  <p className="text-xs uppercase tracking-[0.2em] text-vitae-green/80">
                    {project.label}
                  </p>
                  <h3 className="text-lg font-semibold leading-snug text-white">{project.title}</h3>
                  <p className="mb-2 line-clamp-3 min-h-[3.75rem] w-full text-sm leading-5 text-white/70">
                    {project.description}
                  </p>
                  <Link
                    href={project.href}
                    className="glass-panel glass-panel--lit glass-panel--hover flex min-h-[52px] w-full items-center justify-center rounded-xl px-8 text-base font-medium tracking-wide text-[#00ff00] transition-colors hover:text-white sm:w-auto sm:min-w-[160px]"
                    style={{ textShadow: '0 0 12px rgba(0,255,0,0.35)' }}
                  >
                    <span className="relative z-10">Open</span>
                  </Link>
                </div>
              </GlassContainer>
            );
          })}
        </div>
      </div>
    </section>
  );
}
