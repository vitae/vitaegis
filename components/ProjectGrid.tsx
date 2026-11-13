import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/components/projects';

interface ProjectGridProps {
  reveal?: boolean;
  className?: string;
  /** Show only these hrefs, in this order. Omit for every project. */
  only?: string[];
}

export default function ProjectGrid({ reveal = true, className = '', only }: ProjectGridProps) {
  const shown = only
    ? only.map((href) => projects.find((p) => p.href === href)).filter((p) => p !== undefined)
    : projects;
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ${className}`}>
      {shown.map((project) => (
        <ProjectCard key={project.href} project={project} reveal={reveal} />
      ))}
    </div>
  );
}
