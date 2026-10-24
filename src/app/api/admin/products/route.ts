import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { handleError, json, readJson } from "@/lib/http";
import { escapeRegex, parseLimit, parsePage, sanitizeSearch } from "@/lib/search";
import { productInputSchema } from "@/lib/validation/catalog";
import { ProductModel } from "@/models/product";
import { writeAudit } from "@/services/audit";
import { createProduct } from "@/services/catalog";

export async function GET(request: Request) {
  try {
    await requireAdmin("products.write", request);
    await connectDB();
    const url = new URL(request.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = parseLimit(url.searchParams.get("limit"), 20, 100);
    const q = sanitizeSearch(url.searchParams.get("q") ?? "");
    const status = url.searchParams.get("status");
    const filter: Record<string, unknown> = {};
    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;
    if (status === "archived") filter.isArchived = true;
    else if (status !== "archived") filter.isArchived = false;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: pattern }, { sku: pattern }, { slug: pattern }];
    }
    const [items, total] = await Promise.all([
      ProductModel.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(filter),
    ]);
    return json({ items, total, page, limit });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("products.write", request);
    const input = productInputSchema.parse(await readJson(request));
    const product = await createProduct(input);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "product.create", entityType: "product", entityId: String(product._id) });
    return json({ product }, 201);
  } catch (error) {
    return handleError(error);
  }
}
