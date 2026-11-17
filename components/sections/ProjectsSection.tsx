import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';
import UnlockProjectsButton from '@/components/UnlockProjectsButton';
import { projects } from '@/components/projects';
import { LOCKED_PROJECTS, PROJECTS_PRICE_LABEL } from '@/lib/projects-access';

export default function ProjectsSection() {
  const locked = LOCKED_PROJECTS.map((href) => projects.find((p) => p.href === href)).filter(
    (p) => p !== undefined,
  );

  return (
    <section
      id="projects"
      className="relative flex flex-col items-center py-10 text-center sm:py-14"
    >
      <div className="section-container min-w-0">
        <SectionTitle tagline={`${PROJECTS_PRICE_LABEL} each. Pay once, keep access.`}>
          Projects
        </SectionTitle>
        <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {locked.map((project) => {
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
                  <UnlockProjectsButton project={project.href} />
                </div>
              </GlassContainer>
            );
          })}
        </div>
      </div>
    </section>
  );
}
