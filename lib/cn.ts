import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class composition: conditional classes, later ones win. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
