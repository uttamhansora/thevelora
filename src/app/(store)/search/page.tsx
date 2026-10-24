import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/site-chrome";
import { EmptyState } from "@/components/shared/states";
import { sanitizeSearch } from "@/lib/search";
import { listPublicProducts } from "@/services/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const q = sanitizeSearch(Array.isArray(query.q) ? query.q[0] ?? "" : query.q ?? "");
  let result: Awaited<ReturnType<typeof listPublicProducts>> | null = null;
  let error = "";
  if (q) {
    try {
      result = await listPublicProducts({ q, page: typeof query.page === "string" ? query.page : null });
    } catch {
      error = "Search is unavailable right now.";
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-5xl">Search</h1>
      <form className="mt-6 flex gap-2" method="get"><input className="field" name="q" defaultValue={q} aria-label="Search" /><button className="btn" type="submit">Search</button></form>
      {error ? <p className="mt-4">{error}</p> : null}
      {!q ? <div className="mt-6"><EmptyState title="Search the edit" body="Look up a saree by name or SKU." /></div> : null}
      {result && result.items.length === 0 ? <div className="mt-6"><EmptyState title="No results" body="Try a different name or SKU." /></div> : null}
      {result && result.items.length > 0 ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{result.items.map((product) => <ProductCard key={product.slug} product={product} />)}</div> : null}
      {result && result.total > result.limit ? <Link className="btn btn-secondary mt-6" href={`/search?q=${encodeURIComponent(q)}&page=${result.page + 1}`}>More</Link> : null}
    </div>
  );
}
