'use client';


import GlassContainer from '@/components/GlassContainer';
import BuyButton from '@/components/BuyButton';

export default function TokenSection() {
  // Example digital products
  const products = [
    {
      name: 'Matcha Green Tea from Yame, Japan',
      description: 'Premium ceremonial matcha direct from Yame, Fukuoka. Includes digital NFT certificate.',
      image: '/images/matcha.jpg',
      price: '$29.99',
      featured: true,
    },
    {
      name: 'The Art of Zen: NFT eBook',
      description: 'A beautifully illustrated eBook on Zen philosophy, delivered as an NFT.',
      image: '/images/zenbook.jpg',
      price: '$14.99',
    },
    {
      name: 'Yoga for Life: NFT Guide',
      description: 'A digital yoga guide with lifetime updates, secured on-chain as an NFT.',
      image: '/images/yogabook.jpg',
      price: '$19.99',
    },
    {
      name: 'Tai Chi Flow: NFT Video Course',
      description: 'A full video course on Tai Chi, with NFT proof of ownership.',
      image: '/images/taichicourse.jpg',
      price: '$24.99',
    },
  ];

  return (
    <section id="token" className="relative min-h-screen flex flex-col items-center justify-center text-center">
      <div className="section-container flex flex-col items-center justify-center mx-auto w-full max-w-full min-w-0">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-8">
          <span className="text-vitae-green">NFT Store</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
          {products.map((product, idx) => (
            <GlassContainer
              key={product.name}
              variant="default"
              glow={product.featured}
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
