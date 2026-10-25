import Link from "next/link";
import { HeroBanner, ProductCard } from "@/components/storefront/site-chrome";
import { EmptyState } from "@/components/shared/states";
import { homeRails } from "@/services/catalog";
import { getStoreSettingsSafe } from "@/services/settings";
import { formatInr } from "@/lib/money";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";

const categoryPlaceholders = [
  "/images/fallbacks/category-silk.jpg",
  "/images/fallbacks/category-everyday.jpg",
  "/images/fallbacks/category-festive.jpg",
  "/images/fallbacks/category-new-arrivals.jpg",
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { settings } = await getStoreSettingsSafe();
  let rails: Awaited<ReturnType<typeof homeRails>> = { newest: [], best: [], featured: [] };
  try {
    rails = await homeRails();
  } catch {
    rails = { newest: [], best: [], featured: [] };
  }
  return (
    <div>
      <HeroBanner settings={settings} />
      {settings.sections.categories ? (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-serif text-4xl">Shop by category</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {settings.categoryCards.map((card, index) => (
              <Link key={card.href} href={card.href} className="card group overflow-hidden">
                <div className="relative flex aspect-[4/5] items-end bg-rose/50 p-4">
                  <ImageWithFallback src={card.image.url || categoryPlaceholders[index % categoryPlaceholders.length]} fallbackSrc={categoryPlaceholders[index % categoryPlaceholders.length]} alt={card.image.alt || card.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="relative rounded-full bg-text/65 px-4 py-2 font-serif text-2xl text-white sm:text-3xl">{card.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {settings.sections.bestSellers ? <ProductRail title="Best sellers" products={rails.best} empty="Bestsellers appear here when an administrator marks published products, or after verified sales are recorded." /> : null}
      {settings.sections.newArrivals ? <ProductRail title="New arrivals" products={rails.newest} empty="New sarees will appear here after they are published." /> : null}
      {settings.sections.featured ? <ProductRail title="Featured collections" products={rails.featured} empty="Featured products will appear here when they are marked in the catalogue." /> : null}
      {settings.sections.brandStory ? (
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-4xl">{settings.brandStory.title}</h2>
            <p className="mt-4 leading-7 text-muted">{settings.brandStory.body}</p>
          </div>
          <div className="flex min-h-64 overflow-hidden rounded-3xl bg-rose/40">
            <ImageWithFallback src={settings.brandStory.image.url || "/images/fallbacks/category-everyday.jpg"} fallbackSrc="/images/fallbacks/category-everyday.jpg" alt={settings.brandStory.image.alt || ""} className="h-full w-full object-cover" />
          </div>
        </section>
      ) : null}
      {settings.sections.whyShop ? (
        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-2">
          {settings.whyShop.map((item) => <article key={item.title} className="card p-5"><h3 className="font-serif text-2xl">{item.title}</h3><p className="mt-2 text-muted">{item.body}</p></article>)}
        </section>
      ) : null}
      {settings.sections.policies ? (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-serif text-4xl">Delivery and returns</h2>
          <p className="mt-3 max-w-3xl text-muted">{settings.shipping.deliveryNote} Shipping is {formatInr(settings.shipping.flatRatePaise)}{settings.shipping.freeShippingThresholdPaise > 0 ? `, or complimentary from ${formatInr(settings.shipping.freeShippingThresholdPaise)}.` : "."}</p>
          <div className="mt-4 flex gap-4 text-sm"><Link href="/policies/returns">Returns</Link><Link href="/policies/privacy">Privacy</Link><Link href="/contact">Customer support</Link></div>
        </section>
      ) : null}
    </div>
  );
}

function ProductRail({ title, products, empty }: { title: string; products: { slug: string; name: string; pricePaise: number; compareAtPricePaise: number | null; images: { url: string; alt: string }[]; inStock: boolean }[]; empty: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="font-serif text-4xl">{title}</h2>
      {products.length === 0 ? <div className="mt-6"><EmptyState title={title} body={empty} /></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div>}
    </section>
  );
}
