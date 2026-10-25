/**
 * Local in-memory implementation of the storefront catalog/checkout services.
 *
 * Two purposes:
 * 1. `npm run seed:demo` imports DEMO_PRODUCTS from src/data/demo-products.ts
 *    into MongoDB through these helpers (upsert by slug, idempotent).
 * 2. When no database is configured (or VELORA_DEMO_DATA=1), the service layer
 *    falls back to this module so the whole storefront — listing, search,
 *    filters, product pages, cart quotes, and checkout orders — works locally
 *    with realistic sample data. This fallback mode is clearly announced in
 *    the UI banner; production keeps using MongoDB untouched.
 */


import {
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_PRODUCTS,
  DEMO_REVIEWS,
  type DemoProduct,
} from "@/data/demo-products";
import { AppError } from "@/lib/errors";
import { checkPinServiceability, quoteTotals } from "@/lib/pricing";
import { defaultStoreSettings } from "@/lib/validation/settings";
import { escapeRegex, parseLimit, parsePage, sanitizeSearch } from "@/lib/search";

/* ------------------------------------------------------------------ */
/* Synthetic, stable ObjectIds derived from slugs (demo ids only)      */
/* ------------------------------------------------------------------ */

export function demoId(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16).padStart(8, "0").repeat(3).slice(0, 24);
}

const DAY = 86_400_000;

type DemoTaxonomyDoc = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  isPublished: boolean;
  isArchived: boolean;
  seoTitle: string;
  seoDescription: string;
};

const categoryDocs: DemoTaxonomyDoc[] = DEMO_CATEGORIES.map((item, index) => ({
  _id: `cat-${demoId(item.slug)}`,
  ...item,
  imageUrl: "",
  imageAlt: item.name,
  sortOrder: index,
  isPublished: true,
  isArchived: false,
  seoTitle: item.name,
  seoDescription: item.description,
}));

const collectionDocs: DemoTaxonomyDoc[] = DEMO_COLLECTIONS.map((item, index) => ({
  _id: `col-${demoId(item.slug)}`,
  ...item,
  imageUrl: "",
  imageAlt: item.name,
  sortOrder: index,
  isPublished: true,
  isArchived: false,
  seoTitle: item.name,
  seoDescription: item.description,
}));

export type DemoVariant = DemoProduct["variants"][number] & { _id: string };
export type DemoProductDoc = Omit<DemoProduct, "categorySlug" | "collectionSlugs" | "variants"> & {
  _id: string;
  categoryId: string | null;
  collectionIds: string[];
  variants: DemoVariant[];
  createdAt: Date;
  updatedAt: Date;
};

function toDemoVariant(input: DemoProduct["variants"][number], index: number, slug: string): DemoVariant {
  return { _id: `var-${demoId(`${slug}-${input.sku}`)}-${index}`, ...input };
}

const productDocs: DemoProductDoc[] = DEMO_PRODUCTS.map((product) => {
  const { categorySlug, collectionSlugs, ...rest } = product;
  return {
    ...rest,
    _id: `prd-${demoId(product.slug)}`,
    categoryId: categorySlug ? `cat-${demoId(categorySlug)}` : null,
    collectionIds: collectionSlugs.map((slug) => `col-${demoId(slug)}`),
    variants: product.variants.map((variant, index) => toDemoVariant(variant, index, product.slug)),
    createdAt: new Date(Date.now() - product.createdAtOffsetDays * DAY),
    updatedAt: new Date(),
  };
});

/* Mutable stock/orders so a demo session behaves like a real store. */
const stockBySku = new Map<string, number>();
for (const product of productDocs) {
  if (product.variants.length > 0) {
    for (const variant of product.variants) stockBySku.set(variant.sku, variant.stockQuantity);
  } else {
    stockBySku.set(product.sku, product.stockQuantity);
  }
}

const orders: RecordOrder[] = [];
type RecordOrder = {
  publicToken: string;
  orderNumber: string;
  fullName: string;
  mobile: string;
  email: string;
  addressLine: string;
  landmark: string;
  city: string;
  state: string;
  pinCode: string;
  notes: string;
  items: { productId: string; name: string; slug: string; sku: string; variantName: string; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
  totals: { subtotalPaise: number; discountPaise: number; shippingCostPaise: number; taxPaise: number; totalPaise: number };
  paymentStatus: string;
  orderStatus: string;
  paymentReference: string;
  fulfillment: { courier: string; trackingNumber: string };
  createdAt: Date;
};

/* ------------------------------------------------------------------ */
/* Public view mapping (mirrors toPublicProduct in services/catalog)   */
/* ------------------------------------------------------------------ */

function effectiveStock(doc: DemoProductDoc): { stock: number; variantStocks: Map<string, number> } {
  const variantStocks = new Map<string, number>();
  if (doc.variants.length > 0) {
    let sum = 0;
    for (const variant of doc.variants) {
      const value = stockBySku.get(variant.sku) ?? variant.stockQuantity;
      variantStocks.set(variant.sku, value);
      sum += value;
    }
    return { stock: sum, variantStocks };
  }
  return { stock: stockBySku.get(doc.sku) ?? doc.stockQuantity, variantStocks };
}

export function demoToPublic(doc: DemoProductDoc) {
  const { stock, variantStocks } = effectiveStock(doc);
  const category = categoryDocs.find((item) => item._id === doc.categoryId);
  const collections = collectionDocs.filter((item) => doc.collectionIds.includes(item._id));
  return {
    id: doc._id,
    name: doc.name,
    slug: doc.slug,
    sku: doc.sku,
    shortDescription: doc.shortDescription,
    description: doc.description,
    pricePaise: doc.pricePaise,
    compareAtPricePaise: doc.compareAtPricePaise,
    images: doc.images.map((image) => ({ url: image.url, alt: image.alt || doc.name, width: null, height: null })),
    attributes: {
      fabric: doc.fabric,
      color: doc.color,
      pattern: doc.pattern,
      sareeLength: doc.sareeLength,
      blousePiece: doc.blousePiece,
      careInstructions: doc.careInstructions,
      dimensions: "",
    },
    variants: doc.variants.map((variant) => ({
      id: variant._id,
      name: variant.name,
      sku: variant.sku,
      pricePaise: variant.priceOverridePaise ?? doc.pricePaise,
      stockQuantity: variantStocks.get(variant.sku) ?? variant.stockQuantity,
      color: variant.color ?? "",
    })),
    stockQuantity: stock,
    inStock: stock > 0,
    isFeatured: doc.isFeatured,
    isBestSeller: doc.isBestSeller,
    tags: doc.tags,
    category: category ? { name: category.name, slug: category.slug } : null,
    collections: collections.map((item) => ({ name: item.name, slug: item.slug })),
    seo: { title: doc.name, description: doc.shortDescription },
    purchasable: stock > 0,
    rating: doc.rating,
    reviewCount: doc.reviewCount,
    salesCount: doc.salesCount,
  };
}

export type DemoPublicProduct = ReturnType<typeof demoToPublic>;

/* ------------------------------------------------------------------ */
/* Catalog reads                                                       */
/* ------------------------------------------------------------------ */

function matchesText(doc: DemoProductDoc, pattern: RegExp): boolean {
  return pattern.test(doc.name) || pattern.test(doc.sku) || doc.tags.some((tag) => pattern.test(tag)) || pattern.test(doc.shortDescription);
}

export function demoListProducts(query: {
  collectionSlug?: string;
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
  const page = parsePage(query.page);
  const limit = parseLimit(query.limit);
  let docs = [...productDocs];
  if (query.collectionSlug) docs = docs.filter((doc) => doc.collectionIds.includes(`col-${demoId(query.collectionSlug!)}`));
  if (query.categorySlug) docs = docs.filter((doc) => doc.categoryId === `cat-${demoId(query.categorySlug!)}`);
  const q = sanitizeSearch(query.q ?? "");
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    docs = docs.filter((doc) => matchesText(doc, pattern));
  }
  if (query.color) docs = docs.filter((doc) => doc.color.toLowerCase() === query.color!.toLowerCase());
  if (query.fabric) docs = docs.filter((doc) => doc.fabric.toLowerCase().includes(query.fabric!.toLowerCase()));
  if (query.availability === "in") docs = docs.filter((doc) => effectiveStock(doc).stock > 0);
  if (query.availability === "out") docs = docs.filter((doc) => effectiveStock(doc).stock === 0);
  const min = query.min ? Math.round(Number(query.min) * 100) : undefined;
  const max = query.max ? Math.round(Number(query.max) * 100) : undefined;
  if (min != null && Number.isFinite(min)) docs = docs.filter((doc) => doc.pricePaise >= min);
  if (max != null && Number.isFinite(max)) docs = docs.filter((doc) => doc.pricePaise <= max);

  switch (query.sort) {
    case "price_asc":
      docs.sort((a, b) => a.pricePaise - b.pricePaise);
      break;
    case "price_desc":
      docs.sort((a, b) => b.pricePaise - a.pricePaise);
      break;
    case "best_selling":
      docs.sort((a, b) => b.salesCount - a.salesCount || b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case "rating":
      docs.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    default:
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const total = docs.length;
  const items = docs.slice((page - 1) * limit, page * limit).map(demoToPublic);
  const colors = [...new Set(productDocs.map((doc) => doc.color).filter(Boolean))].sort();
  const fabrics = [...new Set(productDocs.map((doc) => doc.fabric).filter(Boolean))].sort();
  return { items, total, page, limit, colors, fabrics };
}

export function demoHomeRails() {
  const newest = [...productDocs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8).map(demoToPublic);
  const best = productDocs.filter((doc) => doc.isBestSeller).sort((a, b) => b.salesCount - a.salesCount).slice(0, 8).map(demoToPublic);
  const featured = productDocs.filter((doc) => doc.isFeatured).slice(0, 8).map(demoToPublic);
  const trending = [...productDocs].sort((a, b) => b.salesCount - a.salesCount).slice(0, 8).map(demoToPublic);
  return { newest, best, featured, trending };
}

export function demoGetProduct(idOrSlug: string) {
  const doc = productDocs.find((item) => item.slug === idOrSlug || item._id === idOrSlug || item.sku.toUpperCase() === idOrSlug.toUpperCase());
  return doc ?? null;
}

export function demoRelatedProducts(doc: DemoProductDoc, limit = 4) {
  return productDocs
    .filter((item) => item._id !== doc._id && (item.categoryId === doc.categoryId || item.collectionIds.some((id) => doc.collectionIds.includes(id))))
    .slice(0, limit)
    .map(demoToPublic);
}

export function demoTaxonomy(kind: "category" | "collection") {
  const docs = kind === "category" ? categoryDocs : collectionDocs;
  return docs.map((doc) => ({ ...doc }));
}

export function demoReviews(slug: string) {
  const reviews = DEMO_REVIEWS.filter((review) => review.productSlug === slug);
  return reviews.map((review, index) => ({
    id: `rev-${demoId(slug)}-${index}`,
    name: review.name,
    rating: review.rating,
    body: review.body,
    isSample: true,
    createdAt: new Date(Date.now() - (index + 2) * 7 * DAY).toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* Cart quoting (server-side calculation, mirrors services/quote)      */
/* ------------------------------------------------------------------ */

export function demoQuoteCart(input: { items: { productId: string; variantSku?: string | null; quantity: number }[]; couponCode?: string; pinCode?: string }) {
  const settings = defaultStoreSettings;
  if (input.pinCode) {
    const pin = checkPinServiceability(input.pinCode, settings.shipping);
    if (!pin.ok) throw new AppError(pin.message, 400);
  }
  const lines: { unitPricePaise: number; quantity: number }[] = [];
  const resolved: unknown[] = [];
  for (const requested of input.items) {
    const doc = demoGetProduct(requested.productId);
    if (!doc) {
      resolved.push({ productId: requested.productId, available: false, message: "This product is unavailable." });
      continue;
    }
    const variant = requested.variantSku ? doc.variants.find((item) => item.sku === requested.variantSku) ?? null : null;
    if (doc.variants.length > 0 && !variant) {
      resolved.push({ productId: doc._id, available: false, message: "Select an available variant." });
      continue;
    }
    const stock = variant ? stockBySku.get(variant.sku) ?? 0 : effectiveStock(doc).stock;
    const quantity = Math.min(requested.quantity, stock, 10);
    const unitPricePaise = variant?.priceOverridePaise ?? doc.pricePaise;
    if (quantity < 1) {
      resolved.push({ ...demoToPublic(doc), variantSku: variant?.sku ?? null, available: false, quantity: 0, unitPricePaise, lineTotalPaise: 0, message: "Out of stock." });
      continue;
    }
    lines.push({ unitPricePaise, quantity });
    resolved.push({
      ...demoToPublic(doc),
      variantSku: variant?.sku ?? null,
      variantName: variant?.name ?? "",
      available: true,
      quantity,
      unitPricePaise,
      lineTotalPaise: unitPricePaise * quantity,
      message: quantity < requested.quantity ? "Quantity was reduced to the available stock." : "",
    });
  }
  /* No coupons exist in demo mode unless seeded; keep behaviour explicit. */
  const totals = quoteTotals({ lines, coupon: null, shipping: settings.shipping, tax: settings.tax });
  return { items: resolved, totals, couponMessage: input.couponCode ? "Coupons are managed by the store and are not configured in demo mode." : "" };
}

/* ------------------------------------------------------------------ */
/* Demo order placement                                                */
/* ------------------------------------------------------------------ */

function decrementStock(sku: string, delta: number) {
  stockBySku.set(sku, Math.max(0, (stockBySku.get(sku) ?? 0) - delta));
}

export async function demoCreateOrder(input: {
  fullName: string;
  mobile: string;
  email?: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  notes?: string;
  couponCode?: string;
  accepted: boolean;
  items: { productId: string; variantSku?: string | null; quantity: number }[];
}) {
  if (!input.accepted) throw new AppError("Please accept the privacy policy and terms.", 400);
  if (input.items.length === 0) throw new AppError("Your bag is empty.", 400);
  const quote = demoQuoteCart({ items: input.items, couponCode: input.couponCode, pinCode: input.pinCode });
  const reserved: { sku: string; quantity: number; name: string }[] = [];
  const orderItems = [] as RecordOrder["items"];
  try {
    for (const line of quote.items as Array<ReturnType<typeof demoToPublic> & { variantSku?: string | null; variantName?: string; quantity: number; unitPricePaise: number; lineTotalPaise: number; available: boolean }>) {
      const doc = demoGetProduct(line.id ?? line.slug);
      if (!doc) throw new AppError("A product in your bag is no longer available.", 409);
      if (!line.available || line.quantity < 1) throw new AppError(`${doc.name} does not have enough stock.`, 409);
      const sku = line.variantSku || doc.sku;
      decrementStock(sku, line.quantity);
      reserved.push({ sku, quantity: line.quantity, name: doc.name });
      orderItems.push({
        productId: doc._id,
        name: doc.name,
        slug: doc.slug,
        sku,
        variantName: line.variantName || "",
        quantity: line.quantity,
        unitPricePaise: line.unitPricePaise,
        lineTotalPaise: line.lineTotalPaise,
      });
    }
  } catch (error) {
    for (const item of reserved) stockBySku.set(item.sku, (stockBySku.get(item.sku) ?? 0) + item.quantity);
    throw error;
  }
  const orderNumber = `VEL-DEMO-${String(orders.length + 1).padStart(5, "0")}`;
  const order: RecordOrder = {
    publicToken: `demo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    orderNumber,
    fullName: input.fullName,
    mobile: input.mobile,
    email: input.email || "",
    addressLine: input.addressLine,
    landmark: input.landmark || "",
    city: input.city,
    state: input.state,
    pinCode: input.pinCode,
    notes: input.notes || "",
    items: orderItems,
    totals: quote.totals,
    paymentStatus: "awaiting_payment",
    orderStatus: "placed",
    paymentReference: "",
    fulfillment: { courier: "", trackingNumber: "" },
    createdAt: new Date(),
  };
  orders.unshift(order);
  return { order, quote };
}

export function demoGetOrderByToken(token: string) {
  return orders.find((order) => order.publicToken === token) ?? null;
}

export function demoSubmitPaymentReference(token: string, reference: string) {
  const order = demoGetOrderByToken(token);
  if (!order) throw new AppError("Order not found.", 404);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{5,39}$/.test(reference)) throw new AppError("Enter the UTR or payment reference exactly as it appears in your bank statement.", 400);
  order.paymentReference = reference.toUpperCase();
  order.paymentStatus = "awaiting_verification";
  return order;
}

export function demoListOrdersForMobile(mobile: string) {
  return orders.filter((order) => order.mobile === mobile);
}

/* ------------------------------------------------------------------ */
/* Seeding helpers used by scripts/seed-demo-data.ts                   */
/* ------------------------------------------------------------------ */

export function demoSeedPayloads() {
  return { categories: categoryDocs, collections: collectionDocs, products: productDocs };
}
