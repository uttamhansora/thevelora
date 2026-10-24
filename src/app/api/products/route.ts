import { handleError, json } from "@/lib/http";
import { listPublicProducts } from "@/services/catalog";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await listPublicProducts({
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
    return json(result);
  } catch (error) {
    return handleError(error);
  }
}
