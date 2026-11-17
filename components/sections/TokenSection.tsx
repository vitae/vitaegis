import Image from 'next/image';
import GlassContainer from '@/components/GlassContainer';
import BuyButton from '@/components/BuyButton';
import SectionTitle from '@/components/SectionTitle';
import { STORE_PRODUCTS, formatPrice } from '@/lib/store';

export default function TokenSection() {
  return (
    <section id="token" className="relative flex flex-col items-center py-10 text-center sm:py-14">
      <div className="section-container min-w-0">
        <SectionTitle>Store</SectionTitle>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {STORE_PRODUCTS.map((product) => (
            <GlassContainer
              key={product.id}
              variant="default"
              glow
              lit
              padding="md"
              className="reveal flex h-full flex-col text-center"
            >
              <div className="flex h-full w-full flex-col items-center gap-3">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b0f0c]">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 92vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-1 flex min-h-[3.125rem] w-full items-center justify-center text-lg font-semibold leading-snug text-white">
                  <span className="line-clamp-2">{product.name}</span>
                </h3>
                <p className="mb-2 line-clamp-3 min-h-[3.75rem] w-full text-sm leading-5 text-white/70">
                  {product.description}
                </p>
                <BuyButton productId={product.id} priceLabel={formatPrice(product.priceCents)} />
              </div>
            </GlassContainer>
          ))}
        </div>
      </div>
    </section>
  );
}
