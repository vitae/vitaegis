'use client';

import GlassContainer from '@/components/GlassContainer';
import BuyButton from '@/components/BuyButton';
import SectionTitle from '@/components/SectionTitle';
import { STORE_PRODUCTS, formatPrice } from '@/lib/store';

export default function TokenSection() {
  return (
    <section id="token" className="relative flex flex-col items-center py-10 text-center sm:py-14">
      <div className="section-container flex flex-col items-center justify-center mx-auto w-full max-w-full min-w-0">
        <SectionTitle>Store</SectionTitle>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {STORE_PRODUCTS.map((product) => (
            <GlassContainer
              key={product.id}
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
                <BuyButton productId={product.id} priceLabel={formatPrice(product.priceCents)} />
              </div>
            </GlassContainer>
          ))}
        </div>
      </div>
    </section>
  );
}
