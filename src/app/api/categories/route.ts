import { handleError, json } from "@/lib/http";
import { listTaxonomy } from "@/services/catalog";

export async function GET() {
  try {
    const categories = await listTaxonomy("category");
    return json({
      categories: categories
        .filter((item) => item.isPublished && !item.isArchived)
        .map((item) => ({ name: item.name, slug: item.slug, description: item.description, imageUrl: item.imageUrl, imageAlt: item.imageAlt })),
    });
  } catch (error) {
    return handleError(error);
  }
}
