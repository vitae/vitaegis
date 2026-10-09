'use client';

import GlassContainer from '@/components/GlassContainer';
import BuyButton from '@/components/BuyButton';
import SectionTitle from '@/components/SectionTitle';

export default function TokenSection() {
  // Example digital products
  const products = [
    {
      name: 'Matcha Green Tea from Yame, Japan',
      description: 'Premium ceremonial matcha direct from Yame, Fukuoka.',
      image: '/images/matcha.jpg',
      price: '$29.99',
      featured: true,
    },
    {
      name: 'The Art of Zen',
      description: 'A beautifully illustrated eBook on Zen philosophy.',
      image: '/images/zenbook.jpg',
      price: '$14.99',
    },
    {
      name: 'Yoga for Life',
      description: 'A digital yoga guide with lifetime updates.',
      image: '/images/yogabook.jpg',
      price: '$19.99',
    },
    {
      name: 'Tai Chi Flow',
      description: 'A full video course on Tai Chi.',
      image: '/images/taichicourse.jpg',
      price: '$24.99',
    },
  ];

  return (
    <section id="token" className="relative flex flex-col items-center py-10 text-center sm:py-14">
      <div className="section-container flex flex-col items-center justify-center mx-auto w-full max-w-full min-w-0">
        <SectionTitle>Store</SectionTitle>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {products.map((product, idx) => (
            <GlassContainer
              key={product.name}
              variant="default"
              glow={product.featured}
              padding="lg"
              className="flex flex-col items-center justify-between h-full min-h-[340px] text-center"
            >
              <div className="flex flex-col items-center gap-3 w-full">
                <img
                  src={product.image}
                  alt={product.name}
                  className="rounded-lg w-full max-w-[220px] aspect-[4/3] object-cover mx-auto border border-white/10 shadow"
                  style={{ background: '#181f1b' }}
                />
                <h3 className="text-xl font-semibold text-white mt-2">{product.name}</h3>
                <p className="text-white/60 text-sm mb-2">{product.description}</p>
                <div className="text-vitae-green font-bold text-lg mb-2">{product.price}</div>
                <BuyButton />
              </div>
            </GlassContainer>
          ))}
        </div>
      </div>
    </section>
  );
}
