import { Types, type QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { isDuplicateKeyError } from "@/lib/mongo";
import { escapeRegex, parseLimit, parsePage, sanitizeSearch } from "@/lib/search";
import type { ProductInput } from "@/lib/validation/catalog";
import { taxonomyInputSchema } from "@/lib/validation/catalog";
import { ProductModel } from "@/models/product";
import { CategoryModel, CollectionModel, type TaxonomyRecord } from "@/models/taxonomy";
import { OrderModel } from "@/models/order";
import { deleteStoredImage } from "@/lib/images/storage";

export type VariantRecord = {
  _id?: Types.ObjectId;
  name: string;
  sku: string;
  priceOverridePaise?: number | null;
  stockQuantity: number;
  color?: string;
};

export type ProductRecord = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  allSkus: string[];
  shortDescription: string;
  description: string;
  categoryId: Types.ObjectId | null;
  collectionIds: Types.ObjectId[];
  images: { url: string; alt: string; publicId: string; width: number | null; height: number | null }[];
  fabric: string;
  color: string;
  pattern: string;
  sareeLength: string;
  blousePiece: string;
  careInstructions: string;
  dimensions: string;
  variants: VariantRecord[];
  pricePaise: number;
  compareAtPricePaise: number | null;
  costPricePaise: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  packageLengthCm: number | null;
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  tags: string[];
  isPublished: boolean;
  isArchived: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  salesCount: number;
  seoTitle: string;
  seoDescription: string;
  createdAt: Date;
  updatedAt: Date;
};

const publicFilter = { isPublished: true, isArchived: false };

export function effectiveUnitPrice(product: Pick<ProductRecord, "pricePaise">, variant?: VariantRecord | null): number {
  return variant?.priceOverridePaise ?? product.pricePaise;
}

export function sellableStock(product: Pick<ProductRecord, "stockQuantity" | "variants">, variant?: VariantRecord | null): number {
  if (product.variants.length > 0) {
    if (!variant) return product.variants.reduce((sum, item) => sum + item.stockQuantity, 0);
    return variant.stockQuantity;
  }
  return product.stockQuantity;
}

export function toPublicProduct(
  product: ProductRecord,
  category: { name: string; slug: string } | null = null,
  collections: { name: string; slug: string }[] = [],
) {
  const stock = sellableStock(product);
  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    pricePaise: product.pricePaise,
    compareAtPricePaise: product.compareAtPricePaise,
    images: product.images.map((image) => ({ url: image.url, alt: image.alt || product.name, width: image.width, height: image.height })),
    attributes: {
      fabric: product.fabric,
      color: product.color,
      pattern: product.pattern,
      sareeLength: product.sareeLength,
      blousePiece: product.blousePiece,
      careInstructions: product.careInstructions,
      dimensions: product.dimensions,
    },
    variants: product.variants.map((variant) => ({
      id: String(variant._id ?? variant.sku),
      name: variant.name,
      sku: variant.sku,
      pricePaise: variant.priceOverridePaise ?? product.pricePaise,
      stockQuantity: variant.stockQuantity,
      color: variant.color ?? "",
    })),
    stockQuantity: stock,
    inStock: stock > 0,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    tags: product.tags,
    category,
    collections,
    seo: { title: product.seoTitle || product.name, description: product.seoDescription || product.shortDescription },
    purchasable: product.isPublished && !product.isArchived && stock > 0,
  };
}

function productPayload(input: ProductInput) {
  const skus = [input.sku, ...input.variants.map((variant) => variant.sku)];
  return {
    ...input,
    allSkus: skus,
    categoryId: input.categoryId ? new Types.ObjectId(input.categoryId) : null,
    collectionIds: input.collectionIds.map((id) => new Types.ObjectId(id)),
  };
}

function rupeeQueryToPaise(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError("Price filters must be amounts in rupees.", 400);
  }
  return Math.round(amount * 100);
}

export async function listPublicProducts(query: {
  collectionId?: string;
  categorySlug?: string;
  q?: string;
  color?: string;
  fabric?: string;
  availability?: string;
  min?: string | null;
  max?: string | null;
  sort?: string | null;
  page?: string | null;
  limit?: string | null;
}) {
  await connectDB();
  const page = parsePage(query.page);
  const limit = parseLimit(query.limit);
  const filter: QueryFilter<ProductRecord> = { ...publicFilter };
  if (query.collectionId && Types.ObjectId.isValid(query.collectionId)) filter.collectionIds = new Types.ObjectId(query.collectionId);
  if (query.categorySlug) {
    const category = await CategoryModel.findOne({ slug: query.categorySlug, ...publicFilter }).lean<TaxonomyRecord | null>();
    if (!category) return { items: [], total: 0, page, limit, colors: [], fabrics: [] };
    filter.categoryId = category._id;
  }
  const q = sanitizeSearch(query.q ?? "");
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: pattern }, { sku: pattern }, { tags: pattern }];
  }
  if (query.color) filter.color = new RegExp(`^${escapeRegex(sanitizeSearch(query.color))}$`, "i");
  if (query.fabric) filter.fabric = new RegExp(`^${escapeRegex(sanitizeSearch(query.fabric))}$`, "i");
  if (query.availability === "in") {
    filter.$and = [
      ...(Array.isArray(filter.$and) ? filter.$and : []),
      { $or: [{ stockQuantity: { $gt: 0 }, variants: { $size: 0 } }, { "variants.stockQuantity": { $gt: 0 } }] },
    ];
  } else if (query.availability === "out") {
    filter.$and = [
      ...(Array.isArray(filter.$and) ? filter.$and : []),
      { stockQuantity: 0, $nor: [{ "variants.stockQuantity": { $gt: 0 } }] },
    ];
  }
  const min = rupeeQueryToPaise(query.min);
  const max = rupeeQueryToPaise(query.max);
  if (min != null || max != null) {
    filter.pricePaise = { ...(min != null ? { $gte: min } : {}), ...(max != null ? { $lte: max } : {}) };
  }
  const sort: Record<string, 1 | -1> =
    query.sort === "price_asc"
      ? { pricePaise: 1 }
      : query.sort === "price_desc"
        ? { pricePaise: -1 }
        : query.sort === "best_selling"
          ? { salesCount: -1, createdAt: -1 }
          : { createdAt: -1 };
  const [items, total, colors, fabrics] = await Promise.all([
    ProductModel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean<ProductRecord[]>(),
    ProductModel.countDocuments(filter),
    ProductModel.distinct("color", { ...publicFilter, color: { $ne: "" } }),
    ProductModel.distinct("fabric", { ...publicFilter, fabric: { $ne: "" } }),
  ]);
  return { items: items.map((item) => toPublicProduct(item)), total, page, limit, colors, fabrics };
}

export async function homeRails() {
  await connectDB();
  const [newest, best, featured] = await Promise.all([
    ProductModel.find(publicFilter).sort({ createdAt: -1 }).limit(4).lean<ProductRecord[]>(),
    ProductModel.find({ ...publicFilter, isBestSeller: true }).sort({ salesCount: -1, createdAt: -1 }).limit(4).lean<ProductRecord[]>(),
    ProductModel.find({ ...publicFilter, isFeatured: true }).sort({ createdAt: -1 }).limit(4).lean<ProductRecord[]>(),
  ]);
  return {
    newest: newest.map((item) => toPublicProduct(item)),
    best: best.map((item) => toPublicProduct(item)),
    featured: featured.map((item) => toPublicProduct(item)),
  };
}

export async function getPublicProduct(slug: string, allowUnpublished = false): Promise<ProductRecord | null> {
  await connectDB();
  const filter = allowUnpublished ? { slug } : { slug, ...publicFilter };
  return ProductModel.findOne(filter).lean<ProductRecord | null>();
}

export async function relatedProducts(product: ProductRecord, limit = 4): Promise<ProductRecord[]> {
  await connectDB();
  return ProductModel.find({
    _id: { $ne: product._id },
    ...publicFilter,
    $or: [{ categoryId: product.categoryId }, { collectionIds: { $in: product.collectionIds } }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<ProductRecord[]>();
}

async function assertUniqueSkus(skus: string[], ignoreId?: string) {
  const query: QueryFilter<ProductRecord> = { allSkus: { $in: skus } };
  if (ignoreId) query._id = { $ne: new Types.ObjectId(ignoreId) };
  const existing = await ProductModel.findOne(query).select("sku").lean<{ sku: string } | null>();
  if (existing) throw new AppError("A product with one of these SKUs already exists.", 409);
}

export async function createProduct(input: ProductInput): Promise<ProductRecord> {
  await connectDB();
  await assertUniqueSkus(input.variants.map((variant) => variant.sku).concat(input.sku));
  try {
    const created = await ProductModel.create(productPayload(input));
    return created.toObject() as ProductRecord;
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("Slug or SKU is already in use.", 409);
    throw error;
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<ProductRecord> {
  await connectDB();
  const current = await ProductModel.findById(id);
  if (!current || current.isArchived) throw new AppError("Product not found.", 404);
  await assertUniqueSkus([input.sku, ...input.variants.map((variant) => variant.sku)], id);
  const previousImages = (current.images ?? []) as ProductRecord["images"];
  current.set(productPayload(input));
  try {
    await current.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("Slug or SKU is already in use.", 409);
    throw error;
  }
  const nextIds = new Set(input.images.map((image) => image.publicId).filter(Boolean));
  for (const image of previousImages) {
    if (image.publicId && !nextIds.has(image.publicId)) {
      const stillUsed = await ProductModel.exists({ "images.publicId": image.publicId, _id: { $ne: current._id } });
      if (!stillUsed) await deleteStoredImage(image.publicId);
    }
  }
  return current.toObject() as ProductRecord;
}

export async function setProductFlags(ids: string[], action: "publish" | "unpublish" | "archive"): Promise<number> {
  await connectDB();
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const update =
    action === "publish"
      ? { isPublished: true, isArchived: false }
      : action === "unpublish"
        ? { isPublished: false }
        : { isPublished: false, isArchived: true };
  const result = await ProductModel.updateMany({ _id: { $in: objectIds } }, update);
  return result.modifiedCount;
}

export async function deleteProduct(id: string): Promise<void> {
  await connectDB();
  const orders = await OrderModel.countDocuments({ "items.productId": new Types.ObjectId(id) });
  if (orders > 0) throw new AppError("This product is on existing orders. Archive it instead of deleting it.", 409);
  const product = await ProductModel.findById(id);
  if (!product) throw new AppError("Product not found.", 404);
  const images = (product.images ?? []) as ProductRecord["images"];
  await product.deleteOne();
  for (const image of images) {
    if (!image.publicId) continue;
    const stillUsed = await ProductModel.exists({ "images.publicId": image.publicId });
    if (!stillUsed) await deleteStoredImage(image.publicId);
  }
}

export async function duplicateProduct(id: string): Promise<ProductRecord> {
  await connectDB();
  const product = await ProductModel.findById(id).lean<ProductRecord | null>();
  if (!product) throw new AppError("Product not found.", 404);
  const suffix = Date.now().toString(36).toUpperCase();
  const input: ProductInput = {
    name: `${product.name} copy`,
    slug: `${product.slug}-copy-${suffix.toLowerCase()}`.slice(0, 80),
    sku: `${product.sku}-${suffix}`.slice(0, 64),
    shortDescription: product.shortDescription,
    description: product.description,
    categoryId: product.categoryId ? String(product.categoryId) : null,
    collectionIds: product.collectionIds.map(String),
    images: product.images,
    fabric: product.fabric,
    color: product.color,
    pattern: product.pattern,
    sareeLength: product.sareeLength,
    blousePiece: product.blousePiece,
    careInstructions: product.careInstructions,
    dimensions: product.dimensions,
    variants: product.variants.map((variant) => ({
      name: variant.name,
      sku: `${variant.sku}-${suffix}`.slice(0, 64),
      priceOverridePaise: variant.priceOverridePaise ?? null,
      stockQuantity: variant.stockQuantity,
      color: variant.color ?? "",
    })),
    pricePaise: product.pricePaise,
    compareAtPricePaise: product.compareAtPricePaise,
    costPricePaise: product.costPricePaise,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    weightGrams: product.weightGrams,
    packageLengthCm: product.packageLengthCm,
    packageWidthCm: product.packageWidthCm,
    packageHeightCm: product.packageHeightCm,
    tags: product.tags,
    isPublished: false,
    isFeatured: false,
    isBestSeller: false,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  };
  return createProduct(input);
}

export async function listTaxonomy(kind: "category" | "collection", includeArchived = false) {
  await connectDB();
  const Model = kind === "category" ? CategoryModel : CollectionModel;
  const filter = includeArchived ? {} : { isArchived: false };
  return Model.find(filter).sort({ sortOrder: 1, name: 1 }).lean<TaxonomyRecord[]>();
}

export async function saveTaxonomy(kind: "category" | "collection", input: unknown, id?: string) {
  await connectDB();
  const parsed = taxonomyInputSchema.parse(input);
  const Model = kind === "category" ? CategoryModel : CollectionModel;
  if (id) {
    const updated = await Model.findOneAndUpdate({ _id: id, isArchived: false }, parsed, { new: true });
    if (!updated) throw new AppError("Record not found.", 404);
    return updated.toObject();
  }
  try {
    return (await Model.create(parsed)).toObject();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("That slug is already in use.", 409);
    throw error;
  }
}

export async function archiveTaxonomy(kind: "category" | "collection", id: string) {
  await connectDB();
  const Model = kind === "category" ? CategoryModel : CollectionModel;
  const updated = await Model.findByIdAndUpdate(id, { isArchived: true, isPublished: false }, { new: true });
  if (!updated) throw new AppError("Record not found.", 404);
  return updated.toObject();
}
