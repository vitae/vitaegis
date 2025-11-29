'use client';

/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Skeleton Components
   Instagram-Style Loading States
   ═══════════════════════════════════════════════════════════════════════════════ */

interface SkeletonProps {
  className?: string;
}

// Base skeleton with shimmer animation
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      aria-hidden="true"
    />
  );
}

// Text line skeleton
export function SkeletonText({ width = '100%', className = '' }: SkeletonProps & { width?: string }) {
  return (
    <div 
      className={`skeleton h-[14px] rounded ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

// Avatar/circle skeleton
export function SkeletonAvatar({ size = 44, className = '' }: SkeletonProps & { size?: number }) {
  return (
    <div 
      className={`skeleton rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

// Card skeleton
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`skeleton rounded-xl p-4 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar size={40} />
        <div className="flex-1">
          <SkeletonText width="60%" className="mb-2" />
          <SkeletonText width="40%" className="h-[12px]" />
        </div>
      </div>
      <SkeletonText className="mb-2" />
      <SkeletonText width="80%" className="mb-2" />
      <SkeletonText width="60%" />
    </div>
  );
}

// Section skeleton
export function SkeletonSection({ className = '' }: SkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText width="150px" className="h-[20px]" />
        <SkeletonText width="80px" className="h-[14px]" />
      </div>
      
      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

// Hero section skeleton
export function SkeletonHero() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4" aria-hidden="true">
      {/* Badge */}
      <div className="skeleton w-40 h-8 rounded-full mb-6" />
      
      {/* Title */}
      <div className="skeleton w-64 sm:w-80 h-12 sm:h-16 rounded-lg mb-4" />
      
      {/* Underline */}
      <div className="skeleton w-32 h-px mb-8" />
      
      {/* Content box */}
      <div className="skeleton w-full max-w-md h-48 rounded-2xl" />
    </div>
  );
}

// Stats skeleton
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className="flex justify-center gap-8" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <SkeletonText width="60px" className="h-[24px] mb-1" />
          <SkeletonText width="40px" className="h-[12px]" />
        </div>
      ))}
    </div>
  );
}

// Practice card skeleton
export function SkeletonPracticeCard() {
  return (
    <div className="skeleton rounded-2xl p-6 h-[280px]" aria-hidden="true">
      <div className="flex justify-center mb-4">
        <SkeletonAvatar size={64} />
      </div>
      <SkeletonText width="60%" className="mx-auto h-[18px] mb-3" />
      <SkeletonText className="mb-2" />
      <SkeletonText width="90%" className="mb-2" />
      <SkeletonText width="70%" />
    </div>
  );
}

export default Skeleton;
