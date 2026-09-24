'use client';

import Link from 'next/link';
import { HiArrowRight } from 'react-icons/hi';
import type { Project } from '@/components/projects';

interface ProjectCardProps {
  project: Project;
  index?: number;
  reveal?: boolean;
}

export default function ProjectCard({ project, index = 0, reveal = true }: ProjectCardProps) {
  const Icon = project.icon;

  return (
    <Link
      href={project.href}
      className={`${
        reveal
          ? 'reveal opacity-0 translate-y-4 transition-all duration-700 [&.revealed]:opacity-100 [&.revealed]:translate-y-0'
          : ''
      } group relative flex flex-col text-left p-4 sm:p-5 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 hover:bg-black/30 hover:border-vitae-green/40 hover:shadow-[0_0_24px_rgba(0,255,65,0.15)] active:scale-[0.98]`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/40 flex items-center justify-center text-vitae-green group-hover:border-vitae-green transition-colors">
          <Icon size={20} />
        </div>
        <span className="text-[0.6rem] tracking-[0.25em] text-vitae-green/70 uppercase">
          {project.label}
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-white mb-1">{project.title}</h3>
      <p className="text-xs sm:text-sm text-white/60 leading-relaxed flex-1">
        {project.description}
      </p>

      <span className="mt-4 inline-flex items-center gap-1 text-xs text-vitae-green/80 group-hover:text-vitae-green transition-colors">
        Open
        <HiArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
