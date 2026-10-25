import { loadLocalEnv } from "./load-env";
import { connectDB } from "../src/lib/db/mongoose";
import { ProductModel } from "../src/models/product";
import { CategoryModel, CollectionModel } from "../src/models/taxonomy";

loadLocalEnv();

const groups: Array<[string, string, string]> = [
  ["Sarees", "sarees", "The full saree edit."],
  ["Silk Sarees", "silk-sarees", "Silk sarees for festive dressing."],
  ["Everyday Wear", "everyday-wear", "Easier drapes for regular days."],
  ["Festive Wear", "festive-wear", "Pieces chosen for celebrations."],
  ["Wedding Collection", "wedding-collection", "Occasion wear for weddings."],
  ["New Arrivals", "new-arrivals", "The latest published pieces."],
];

// Local raster placeholders keep demo products visible when deployed without
// an external image host. Replace these with uploaded product photography.
const productImages = [
  "/images/fallbacks/product.jpg",
  "/images/fallbacks/category-silk.jpg",
  "/images/fallbacks/category-everyday.jpg",
  "/images/fallbacks/category-festive.jpg",
  "/images/fallbacks/category-new-arrivals.jpg",
];

const colors = [
  "Maroon",
  "Royal Blue",
  "Emerald Green",
  "Wine Red",
  "Mustard Yellow",
  "Blush Pink",
  "Black",
  "Ivory",
  "Lavender",
  "Teal",
];

const fabrics = [
  "Silk",
  "Cotton",
  "Georgette",
  "Chiffon",
  "Banarasi Silk",
];

const patterns = [
  "Traditional Woven",
  "Floral",
  "Printed",
  "Embroidered",
  "Solid",
];

const categorySlugs = [
  "silk-sarees",
  "everyday-wear",
  "festive-wear",
  "wedding-collection",
  "new-arrivals",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCategorySlug(fabric: string, index: number): string {
  if (fabric === "Silk" || fabric === "Banarasi Silk") {
    return index % 2 === 0 ? "silk-sarees" : "wedding-collection";
  }

  if (fabric === "Cotton") {
    return "everyday-wear";
  }

  return categorySlugs[index % categorySlugs.length];
}

function buildProducts() {
  const products = [];

  for (let i = 0; i < 50; i++) {
    const color = colors[i % colors.length];
    const fabric = fabrics[Math.floor(i / colors.length)];
    const pattern = patterns[i % patterns.length];

    const name = `${color} ${fabric} Saree`;

    const slug = slugify(name);
    const sku = `VEL-DEMO-${String(i + 1).padStart(3, "0")}`;

    // Prices are stored in paise, following the existing product model.
    const priceRupees = 1499 + (i % 10) * 350;
    const discountRupees = 200 + (i % 5) * 100;

    const categorySlug = getCategorySlug(fabric, i);

    products.push({
      name,
      slug,
      sku,
      allSkus: [sku],

      shortDescription: `${fabric} saree in ${color.toLowerCase()}, designed for elegant everyday and occasion wear.`,

      description: `Discover this ${color.toLowerCase()} ${fabric.toLowerCase()} saree featuring a ${pattern.toLowerCase()} design. A versatile addition to your ethnic wardrobe. Product details are sample catalogue information.`,

      categorySlug,

      imageUrl: productImages[i % productImages.length],

      fabric,
      color,
      pattern,

      sareeLength: "5.5 m",
      blousePiece: "Unstitched blouse piece included",
      careInstructions:
        fabric === "Silk" || fabric === "Banarasi Silk"
          ? "Dry clean recommended."
          : "Follow the care instructions provided with the product.",

      pricePaise: priceRupees * 100,
      compareAtPricePaise: (priceRupees + discountRupees) * 100,

      stockQuantity: 5 + (i % 20),
      lowStockThreshold: 2,

      tags: [
        "catalog-sample",
        fabric.toLowerCase().replace(/\s+/g, "-"),
        color.toLowerCase().replace(/\s+/g, "-"),
      ],

      isPublished: true,
      isArchived: false,
      isFeatured: i < 8,
      isBestSeller: i >= 8 && i < 16,

      salesCount: i * 3,

      seoTitle: name,
      seoDescription: `Shop our ${color.toLowerCase()} ${fabric.toLowerCase()} saree collection.`,
    });
  }

  return products;
}

async function main() {
  await connectDB();

  try {
    // 1. Create missing categories and collections without overwriting
    // existing records.
    for (const [index, [name, slug, description]] of groups.entries()) {
      const payload = {
        name,
        slug,
        description,
        sortOrder: index,
        isPublished: true,
        isArchived: false,
        imageUrl: "",
        imageAlt: name,
        seoTitle: name,
        seoDescription: description,
      };

      await CategoryModel.updateOne(
        { slug },
        { $setOnInsert: payload },
        { upsert: true },
      );

      await CollectionModel.updateOne(
        { slug },
        { $setOnInsert: payload },
        { upsert: true },
      );
    }

    // 2. Load category and collection records.
    const categories = await CategoryModel.find({
      slug: { $in: groups.map((group) => group[1]) },
    });

    const collections = await CollectionModel.find({
      slug: { $in: groups.map((group) => group[1]) },
    });

    const categoryMap = new Map(
      categories.map((category) => [category.slug, category._id]),
    );

    const collectionMap = new Map(
      collections.map((collection) => [collection.slug, collection._id]),
    );

    // 3. Generate 50 unique sample products.
    const products = buildProducts();

    let inserted = 0;
    let skipped = 0;

    for (const product of products) {
      const categoryId = categoryMap.get(product.categorySlug);
      const collectionId = collectionMap.get(product.categorySlug);

      if (!categoryId || !collectionId) {
        console.warn(
          `Skipping ${product.sku}: category or collection not found.`,
        );

        skipped++;
        continue;
      }

      // 4. Do not overwrite an existing product.
      const existingProduct = await ProductModel.findOne({
        $or: [
          { sku: product.sku },
          { slug: product.slug },
        ],
      });

      if (existingProduct) {
        skipped++;
        continue;
      }

      // IMPORTANT:
      // This image object format must match your ProductModel schema.
      // Verify src/models/product before running this script.
      await ProductModel.create({
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        allSkus: product.allSkus,

        shortDescription: product.shortDescription,
        description: product.description,

        categoryId,
        collectionIds: [collectionId],

        images: [
          {
            url: product.imageUrl,
            alt: product.name,
          },
        ],

        fabric: product.fabric,
        color: product.color,
        pattern: product.pattern,

        sareeLength: product.sareeLength,
        blousePiece: product.blousePiece,
        careInstructions: product.careInstructions,

        pricePaise: product.pricePaise,
        compareAtPricePaise: product.compareAtPricePaise,

        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,

        tags: product.tags,

        isPublished: product.isPublished,
        isArchived: product.isArchived,
        isFeatured: product.isFeatured,
        isBestSeller: product.isBestSeller,

        salesCount: product.salesCount,

        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
      });

      inserted++;
    }

    console.log("Velora demo seed completed.");
    console.log(`Products generated: ${products.length}`);
    console.log(`Products inserted: ${inserted}`);
    console.log(`Products skipped: ${skipped}`);
  } finally {
    // If your connectDB helper manages the connection lifecycle itself,
    // use the corresponding project-supported cleanup method here.
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Seed failed";

  console.error(
    message.replace(
      /mongodb(?:\+srv)?:\/\/\S+/gi,
      "mongodb://[redacted]",
    ),
  );

  process.exitCode = 1;
});
