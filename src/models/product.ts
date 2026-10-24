import { Schema, model, models } from "mongoose";

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    publicId: { type: String, default: "" },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { _id: false },
);

const variantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    priceOverridePaise: { type: Number, default: null },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    color: { type: String, default: "" },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    allSkus: { type: [String], required: true },
    shortDescription: { type: String, default: "" },
    description: { type: String, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    collectionIds: { type: [{ type: Schema.Types.ObjectId, ref: "Collection" }], default: [], index: true },
    images: { type: [imageSchema], default: [] },
    fabric: { type: String, default: "" },
    color: { type: String, default: "" },
    pattern: { type: String, default: "" },
    sareeLength: { type: String, default: "" },
    blousePiece: { type: String, default: "" },
    careInstructions: { type: String, default: "" },
    dimensions: { type: String, default: "" },
    variants: { type: [variantSchema], default: [] },
    pricePaise: { type: Number, required: true, min: 0 },
    compareAtPricePaise: { type: Number, default: null },
    costPricePaise: { type: Number, default: null },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 2 },
    weightGrams: { type: Number, default: null },
    packageLengthCm: { type: Number, default: null },
    packageWidthCm: { type: Number, default: null },
    packageHeightCm: { type: Number, default: null },
    tags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0, min: 0 },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
  },
  { timestamps: true },
);

productSchema.index({ allSkus: 1 }, { unique: true });
productSchema.index({ isPublished: 1, isArchived: 1, createdAt: -1 });
productSchema.index({ name: "text", sku: "text", tags: "text", shortDescription: "text" });

export const ProductModel = models.Product || model("Product", productSchema);
