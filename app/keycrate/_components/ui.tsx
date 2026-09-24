import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { TransitionType } from '@/lib/keycrate/harmonic';

/** Transition colours: green for harmonic moves, yellow for deliberate drama, red for clashes. */
export const TRANSITION_COLOR: Record<TransitionType, string> = {
  same: '#00ff00',
  fifth: '#00ff00',
  relative: '#00ff00',
  diagonal: '#00ff00',
  boost: '#ffff00',
  semitone: '#ffff00',
  third: '#ffff00',
  clash: '#ff0000',
  unknown: '#808880',
};

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-md border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40';

const variants = {
  primary: 'border-[#00ff00] bg-[#00ff00] text-black hover:bg-[#33ff33]',
  ghost: 'border-white/15 bg-transparent text-white hover:border-white/40',
  danger: 'border-[#ff0000]/60 bg-transparent text-[#ff0000] hover:bg-[#ff0000]/10',
  quiet: 'border-transparent bg-transparent text-[#808880] hover:text-white',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: 'sm' | 'md' }) {
  return <button type="button" className={`${base} ${variants[variant]} ${size === 'sm' ? 'min-h-[32px] py-1' : 'min-h-[40px] py-2'} ${className}`} {...props} />;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-[#808880] ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'min-h-[40px] w-full rounded-md border border-white/15 bg-black px-3 text-base text-white placeholder:text-[#808880] focus:border-[#00ff00] sm:text-sm';

export function KeyBadge({ camelot, muted = false }: { camelot: string | null; muted?: boolean }) {
  return (
    <span
      className={`kc-mono inline-block min-w-[2.4rem] rounded border px-1.5 py-0.5 text-center text-xs ${
        camelot ? (muted ? 'border-white/15 text-white' : 'border-[#00ff00]/60 text-[#00ff00]') : 'border-[#ff0000]/50 text-[#ff0000]'
      }`}
    >
      {camelot ?? '?'}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h2 className="text-base font-medium text-white">{children}</h2>
      {right}
    </div>
  );
}
