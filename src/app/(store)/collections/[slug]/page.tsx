import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionFilters } from "@/components/storefront/collection-filters";
import { ProductCard } from "@/components/storefront/site-chrome";
import { EmptyState } from "@/components/shared/states";
import { listPublicProducts, listTaxonomy } from "@/services/catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return { title: slug.replaceAll("-", " "), alternates: { canonical: `${appUrl}/collections/${slug}` } };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  let collections: Awaited<ReturnType<typeof listTaxonomy>> = [];
  try {
    collections = await listTaxonomy("collection");
  } catch {
    return <EmptyState title="Catalogue unavailable" body="The store could not reach its database. Check the server configuration and try again." />;
  }
  const collection = collections.find((item) => item.slug === slug && item.isPublished && !item.isArchived);
  if (!collection) notFound();
  const result = await listPublicProducts({
    collectionId: String(collection._id),
    q: one(query.q),
    fabric: one(query.fabric),
    availability: one(query.availability),
    categorySlug: one(query.category),
    min: one(query.min) || null,
    max: one(query.max) || null,
    sort: one(query.sort) || null,
    page: one(query.page) || null,
  });
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  let categories: { slug: string; name: string }[] = [];
  try {
    categories = (await listTaxonomy("category"))
      .filter((item) => item.isPublished && !item.isArchived)
      .map((item) => ({ slug: item.slug, name: item.name }));
  } catch {
    categories = [];
  }
  const pageLink = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const text = one(value);
      if (text && key !== "page") params.set(key, text);
    }
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return search ? `?${search}` : "?";
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[260px_1fr]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CollectionFilters
          categories={categories}
          defaults={{
            q: one(query.q),
            min: one(query.min),
            max: one(query.max),
            fabric: one(query.fabric),
            availability: one(query.availability),
            category: one(query.category),
            sort: one(query.sort),
          }}
        />
      </div>
      <div>
        <h1 className="font-serif text-5xl capitalize">{collection.name}</h1>
        {collection.description ? <p className="mt-3 max-w-2xl text-muted">{collection.description}</p> : null}
        <p className="mt-2 text-sm text-muted">{result.total} products</p>
        {result.items.length === 0 ? <div className="mt-6"><EmptyState title="Nothing in this collection yet" body="Published products assigned to this collection will show up here." /></div> : <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">{result.items.map((product) => <ProductCard key={product.slug} product={product} showActions />)}</div>}
        <div className="mt-6 flex gap-3">
          {result.page > 1 ? <Link className="btn btn-secondary" href={pageLink(result.page - 1)}>Previous</Link> : null}
          {result.page < pages ? <Link className="btn btn-secondary" href={pageLink(result.page + 1)}>Next</Link> : null}
        </div>
      </div>
    </div>
  );
}
