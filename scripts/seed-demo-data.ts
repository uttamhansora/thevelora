import { loadLocalEnv } from "./load-env";
import { connectDB } from "../src/lib/db/mongoose";
import { ProductModel } from "../src/models/product";
import { CategoryModel, CollectionModel } from "../src/models/taxonomy";

loadLocalEnv();

const groups = [
  ["Sarees", "sarees", "The full saree edit."],
  ["Silk Sarees", "silk-sarees", "Silk sarees for festive dressing."],
  ["Everyday Wear", "everyday-wear", "Easier drapes for regular days."],
  ["Festive Wear", "festive-wear", "Pieces chosen for celebrations."],
  ["Wedding Collection", "wedding-collection", "Occasion wear for weddings."],
  ["New Arrivals", "new-arrivals", "The latest published pieces."],
];

async function main() {
  await connectDB();
  for (const [index, [name, slug, description]] of groups.entries()) {
    const payload = { name, slug, description, sortOrder: index, isPublished: true, isArchived: false, imageUrl: "", imageAlt: name, seoTitle: name, seoDescription: description };
    await CategoryModel.updateOne({ slug }, { $setOnInsert: payload }, { upsert: true });
    await CollectionModel.updateOne({ slug }, { $setOnInsert: payload }, { upsert: true });
  }
  const silk = await CategoryModel.findOne({ slug: "silk-sarees" });
  const collection = await CollectionModel.findOne({ slug: "silk-sarees" });
  const exists = await ProductModel.findOne({ sku: "VEL-DEMO-SILK" });
  if (!exists && silk && collection) {
    await ProductModel.create({
      name: "Maroon silk saree",
      slug: "maroon-silk-saree",
      sku: "VEL-DEMO-SILK",
      allSkus: ["VEL-DEMO-SILK"],
      shortDescription: "A sample catalogue saree created by the demo seed.",
      description: "Replace this sample with the store's own photography and product details.",
      categoryId: silk._id,
      collectionIds: [collection._id],
      images: [],
      fabric: "Silk",
      color: "Maroon",
      pattern: "Solid",
      sareeLength: "5.5 m",
      blousePiece: "Unstitched blouse piece included",
      careInstructions: "Dry clean.",
      pricePaise: 449900,
      compareAtPricePaise: 499900,
      stockQuantity: 5,
      lowStockThreshold: 1,
      tags: ["catalog-sample"],
      isPublished: true,
      isArchived: false,
      isFeatured: true,
      isBestSeller: false,
      salesCount: 0,
      seoTitle: "Maroon silk saree",
      seoDescription: "A sample silk saree.",
    });
  }
  console.log("Demo categories and collections were inserted only where the slug did not already exist.");
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seed failed";
  console.error(message.replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://[redacted]"));
  process.exit(1);
});
