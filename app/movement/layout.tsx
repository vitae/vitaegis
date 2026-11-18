import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Movement | VITAEGIS',
  description:
    "Movement at 4:30 PM and yoga at 5:30 PM, every week at Le'ahi Beach Park in Waikiki. Tickets $9.",
};

export default function MovementLayout({ children }: { children: React.ReactNode }) {
  return children;
}
