import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db/mongoose";
import { ProductModel } from "@/models/product";
import { CollectionModel } from "@/models/taxonomy";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const staticRoutes = ["", "/about", "/contact", "/policies/privacy", "/policies/returns", "/policies/terms"].map((path) => ({
    url: `${appUrl}${path || "/"}`,
  }));
  try {
    await connectDB();
    const [products, collections] = await Promise.all([
      ProductModel.find({ isPublished: true, isArchived: false }).select("slug updatedAt").lean<Array<{ slug: string; updatedAt?: Date }>>(),
      CollectionModel.find({ isPublished: true, isArchived: false }).select("slug").lean<Array<{ slug: string }>>(),
    ]);
    return [
      ...staticRoutes,
      ...collections.map((item) => ({ url: `${appUrl}/collections/${item.slug}` })),
      ...products.map((item) => ({ url: `${appUrl}/products/${item.slug}`, lastModified: item.updatedAt })),
    ];
  } catch {
    return staticRoutes;
  }
}
