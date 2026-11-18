import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classes | VITAEGIS',
  description:
    "Sunset Sessions every Monday at Lē'ahi Beach Park, Waikīkī: meditation at 4:30 PM, yoga at 5:30 PM.",
};

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
