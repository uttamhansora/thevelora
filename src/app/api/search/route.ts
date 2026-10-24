import { handleError, json } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/search";
import { getClientIp } from "@/lib/security/request";
import { listPublicProducts, listTaxonomy } from "@/services/catalog";
import { consumeRateLimit } from "@/services/rate-limit";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = sanitizeSearch(url.searchParams.get("q") ?? "");
    if (q.length < 1) throw new AppError("Enter a product name or SKU.", 400);
    await consumeRateLimit("search", getClientIp(request));
    const [products, collections] = await Promise.all([
      listPublicProducts({ q, page: url.searchParams.get("page"), limit: url.searchParams.get("limit") ?? "8" }),
      listTaxonomy("collection"),
    ]);
    const suggestions = collections
      .filter((item) => item.isPublished && !item.isArchived && item.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map((item) => ({ name: item.name, slug: item.slug }));
    return json({ query: q, products: products.items, total: products.total, page: products.page, collections: suggestions });
  } catch (error) {
    return handleError(error);
  }
}
