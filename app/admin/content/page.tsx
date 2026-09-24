import type { Metadata } from 'next';
import ContentReview from './ContentReview';

export const metadata: Metadata = {
  title: 'Content review | VITAEGIS',
  robots: { index: false, follow: false },
};

export default function ContentReviewPage() {
  return <ContentReview />;
}
