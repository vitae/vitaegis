import Link from 'next/link';
import { HiArrowRight } from 'react-icons/hi';
import type { Project } from '@/components/projects';

interface ProjectCardProps {
  project: Project;
  reveal?: boolean;
}

export default function ProjectCard({ project, reveal = true }: ProjectCardProps) {
  const Icon = project.icon;

  return (
    <Link
      href={project.href}
      className={`${reveal ? 'reveal' : ''} group glass-panel glass-panel--hover relative flex flex-col text-left p-4 sm:p-5 rounded-2xl active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/40 flex items-center justify-center text-vitae-green group-hover:border-vitae-green transition-colors">
          <Icon size={20} />
        </div>
        <span className="text-xs tracking-[0.2em] text-vitae-green/80 uppercase">
          {project.label}
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-white mb-1">{project.title}</h3>
      <p className="text-sm text-white/70 leading-relaxed flex-1">{project.description}</p>

      <span className="mt-4 inline-flex items-center gap-1 text-xs text-vitae-green/80 group-hover:text-vitae-green transition-colors">
        Open
        <HiArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
