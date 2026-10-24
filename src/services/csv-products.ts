import { connectDB } from "@/lib/db/mongoose";
import { parseCsv, toCsv } from "@/lib/csv";
import { rupeesToPaise } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { productInputSchema, type ProductInput } from "@/lib/validation/catalog";
import { ProductModel } from "@/models/product";
import { CategoryModel } from "@/models/taxonomy";
import { createProduct, type ProductRecord } from "@/services/catalog";

const HEADERS = ["name", "sku", "slug", "shortDescription", "description", "price", "compareAtPrice", "stockQuantity", "fabric", "color", "categorySlug", "tags", "isPublished"];

export async function exportProductsCsv(): Promise<string> {
  await connectDB();
  const products = await ProductModel.find({ isArchived: false }).lean<ProductRecord[]>();
  const categories = await CategoryModel.find().lean<Array<{ _id: { toString(): string }; slug: string }>>();
  const categorySlug = new Map(categories.map((item) => [String(item._id), item.slug]));
  const rows = [HEADERS];
  for (const product of products) {
    rows.push([
      product.name,
      product.sku,
      product.slug,
      product.shortDescription,
      product.description,
      (product.pricePaise / 100).toFixed(2),
      product.compareAtPricePaise != null ? (product.compareAtPricePaise / 100).toFixed(2) : "",
      String(product.stockQuantity),
      product.fabric,
      product.color,
      product.categoryId ? categorySlug.get(String(product.categoryId)) ?? "" : "",
      product.tags.join("|"),
      product.isPublished ? "true" : "false",
    ]);
  }
  return toCsv(rows);
}

export async function importProductsCsv(text: string): Promise<{ created: number; errors: { row: number; message: string }[] }> {
  await connectDB();
  const table = parseCsv(text);
  if (table.length < 2) return { created: 0, errors: [{ row: 1, message: "The CSV needs a header and at least one product." }] };
  const header = table[0]!.map((cell) => cell.trim());
  const missing = HEADERS.filter((column) => !header.includes(column));
  if (missing.length) return { created: 0, errors: [{ row: 1, message: `Missing columns: ${missing.join(", ")}` }] };
  const index = new Map(header.map((column, position) => [column, position]));
  const categories = await CategoryModel.find().lean<Array<{ _id: { toString(): string }; slug: string }>>();
  const bySlug = new Map(categories.map((item) => [item.slug, String(item._id)]));
  const errors: { row: number; message: string }[] = [];
  let created = 0;
  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const row = table[rowIndex]!;
    const cell = (name: string) => row[index.get(name) ?? -1]?.trim() ?? "";
    try {
      const price = Number(cell("price"));
      const compare = cell("compareAtPrice");
      const categorySlug = cell("categorySlug");
      const input: ProductInput = productInputSchema.parse({
        name: cell("name"),
        sku: cell("sku"),
        slug: cell("slug") || slugify(cell("name")),
        shortDescription: cell("shortDescription"),
        description: cell("description"),
        pricePaise: rupeesToPaise(price),
        compareAtPricePaise: compare ? rupeesToPaise(Number(compare)) : null,
        stockQuantity: Number(cell("stockQuantity") || "0"),
        fabric: cell("fabric"),
        color: cell("color"),
        categoryId: categorySlug ? bySlug.get(categorySlug) ?? null : null,
        tags: cell("tags") ? cell("tags").split("|").map((tag) => tag.trim()).filter(Boolean) : [],
        isPublished: cell("isPublished").toLowerCase() === "true",
        collectionIds: [],
        images: [],
        variants: [],
      });
      if (categorySlug && !input.categoryId) throw new Error(`Unknown category slug ${categorySlug}.`);
      await createProduct(input);
      created += 1;
    } catch (error) {
      errors.push({ row: rowIndex + 1, message: error instanceof Error ? error.message : "Invalid row." });
    }
  }
  return { created, errors };
}
