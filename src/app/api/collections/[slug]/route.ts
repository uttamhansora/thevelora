import { AppError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";
import { listPublicProducts, listTaxonomy } from "@/services/catalog";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const collections = await listTaxonomy("collection");
    const collection = collections.find((item) => item.slug === slug && item.isPublished && !item.isArchived);
    if (!collection) throw new AppError("Collection not found.", 404);
    const url = new URL(request.url);
    const products = await listPublicProducts({
      collectionId: String(collection._id),
      q: url.searchParams.get("q") ?? undefined,
      color: url.searchParams.get("color") ?? undefined,
      fabric: url.searchParams.get("fabric") ?? undefined,
      availability: url.searchParams.get("availability") ?? undefined,
      categorySlug: url.searchParams.get("category") ?? undefined,
      min: url.searchParams.get("min"),
      max: url.searchParams.get("max"),
      sort: url.searchParams.get("sort"),
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
    });
    return json({
      collection: { name: collection.name, slug: collection.slug, description: collection.description, imageUrl: collection.imageUrl, imageAlt: collection.imageAlt },
      ...products,
    });
  } catch (error) {
    return handleError(error);
  }
}
