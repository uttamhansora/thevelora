import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ProductCard } from "@/components/product/product-card";
import { ProductShareBar } from "@/components/product/product-share";
import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { CategoryModel, CollectionModel } from "@/models/taxonomy";
import { getPublicProduct, relatedProducts, toPublicProduct } from "@/services/catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug).catch(() => null);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (!product) return { title: "Product" };
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription,
    alternates: { canonical: `${appUrl}/products/${product.slug}` },
    openGraph: { title: product.name, description: product.shortDescription, images: product.images[0] ? [product.images[0].url] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const preview = query.preview === "1";
  const session = preview ? await getSession().catch(() => null) : null;
  const product = await getPublicProduct(slug, Boolean(session)).catch(() => null);
  if (!product) notFound();
  await connectDB();
  const [category, collections, related] = await Promise.all([
    product.categoryId ? CategoryModel.findById(product.categoryId).lean() : null,
    CollectionModel.find({ _id: { $in: product.collectionIds } }).lean(),
    relatedProducts(product),
  ]);
  const view = toPublicProduct(
    product,
    category ? { name: String(category.name), slug: String(category.slug) } : null,
    collections.map((item) => ({ name: String(item.name), slug: String(item.slug) })),
  );
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: view.name,
    sku: view.sku,
    description: view.description,
    image: view.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (view.pricePaise / 100).toFixed(2),
      availability: view.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${appUrl}/products/${view.slug}`,
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      { "@type": "ListItem", position: 2, name: view.name, item: `${appUrl}/products/${view.slug}` },
    ],
  };
  const attributes = Object.entries(view.attributes).filter(([, value]) => value);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <p className="text-sm text-muted"><Link href="/">Home</Link> / {view.category ? <Link href={`/collections/${view.category.slug}`}>{view.category.name}</Link> : "Saree"}</p>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductGallery images={view.images} name={view.name} />
        <div>
          <h1 className="font-serif text-5xl">{view.name}</h1>
          <p className="mt-4 leading-7">{view.shortDescription}</p>
          <div className="mt-6"><PurchasePanel product={view} /></div>
          <ProductShareBar
            url={`${appUrl}/products/${view.slug}`}
            title={view.name}
            image={view.images[0]?.url}
            className="mt-6"
          />
          <div className="prose mt-8 max-w-none whitespace-pre-wrap">{view.description}</div>
          {attributes.length > 0 ? <dl className="mt-6 grid gap-2">{attributes.map(([key, value]) => <div key={key} className="flex justify-between gap-4 border-b border-border py-2"><dt className="capitalize text-muted">{key.replaceAll(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt><dd>{value}</dd></div>)}</dl> : null}
          <p className="mt-6 text-sm text-muted">Shipping and returns follow the current store policy. A PIN-code match does not guarantee courier serviceability.</p>
        </div>
      </div>
      {related.length > 0 ? <section className="mt-12"><h2 className="font-serif text-4xl">Related</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((item) => <ProductCard key={item.slug} product={toPublicProduct(item)} />)}</div></section> : null}
    </div>
  );
}

