import { AppError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";
import { CategoryModel, CollectionModel } from "@/models/taxonomy";
import { getPublicProduct, relatedProducts, toPublicProduct } from "@/services/catalog";
import { connectDB } from "@/lib/db/mongoose";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const product = await getPublicProduct(slug);
    if (!product) throw new AppError("Product not found.", 404);
    await connectDB();
    const [category, collections, related] = await Promise.all([
      product.categoryId ? CategoryModel.findById(product.categoryId).lean() : null,
      CollectionModel.find({ _id: { $in: product.collectionIds }, isPublished: true, isArchived: false }).lean(),
      relatedProducts(product),
    ]);
    return json({
      product: toPublicProduct(
        product,
        category ? { name: String(category.name), slug: String(category.slug) } : null,
        collections.map((item) => ({ name: String(item.name), slug: String(item.slug) })),
      ),
      related: related.map((item) => toPublicProduct(item)),
    });
  } catch (error) {
    return handleError(error);
  }
}
