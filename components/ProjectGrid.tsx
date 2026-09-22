'use client';

import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/components/projects';

interface ProjectGridProps {
  reveal?: boolean;
  className?: string;
}

// Client-side grid so the icon components never cross the server/client boundary
export default function ProjectGrid({ reveal = true, className = '' }: ProjectGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 ${className}`}>
      {projects.map((project, index) => (
        <ProjectCard key={project.href} project={project} index={index} reveal={reveal} />
      ))}
    </div>
  );
}
