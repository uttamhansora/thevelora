import { z } from "zod";
import { INDIAN_STATES } from "@/lib/india";
import { objectIdSchema, paiseSchema, pinSchema, skuSchema, slugSchema, mobileSchema, emailSchema } from "@/lib/validation/common";

const imageSchema = z.object({
  url: z.string().trim().min(1).max(500),
  alt: z.string().trim().max(180).default(""),
  publicId: z.string().trim().max(240).default(""),
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
});

const variantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sku: skuSchema,
  priceOverridePaise: paiseSchema.nullable().default(null),
  stockQuantity: z.number().int().nonnegative().max(100000),
  color: z.string().trim().max(40).default(""),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    slug: slugSchema,
    sku: skuSchema,
    shortDescription: z.string().trim().max(300).default(""),
    description: z.string().trim().max(20000).default(""),
    categoryId: objectIdSchema.nullable().default(null),
    collectionIds: z.array(objectIdSchema).max(20).default([]),
    images: z.array(imageSchema).max(12).default([]),
    fabric: z.string().trim().max(80).default(""),
    color: z.string().trim().max(40).default(""),
    pattern: z.string().trim().max(80).default(""),
    sareeLength: z.string().trim().max(80).default(""),
    blousePiece: z.string().trim().max(120).default(""),
    careInstructions: z.string().trim().max(1000).default(""),
    dimensions: z.string().trim().max(160).default(""),
    variants: z.array(variantSchema).max(30).default([]),
    pricePaise: paiseSchema,
    compareAtPricePaise: paiseSchema.nullable().default(null),
    costPricePaise: paiseSchema.nullable().default(null),
    stockQuantity: z.number().int().nonnegative().max(100000).default(0),
    lowStockThreshold: z.number().int().nonnegative().max(100000).default(2),
    weightGrams: z.number().int().nonnegative().max(100000).nullable().default(null),
    packageLengthCm: z.number().int().nonnegative().max(500).nullable().default(null),
    packageWidthCm: z.number().int().nonnegative().max(500).nullable().default(null),
    packageHeightCm: z.number().int().nonnegative().max(500).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    isPublished: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    seoTitle: z.string().trim().max(120).default(""),
    seoDescription: z.string().trim().max(300).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.compareAtPricePaise != null && value.compareAtPricePaise <= value.pricePaise) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPricePaise"],
        message: "Original price must be higher than the selling price.",
      });
    }
    const skus = [value.sku, ...value.variants.map((variant) => variant.sku)];
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({ code: "custom", path: ["sku"], message: "Each SKU on a product must be unique." });
    }
    for (const [index, variant] of value.variants.entries()) {
      if (variant.priceOverridePaise != null && variant.priceOverridePaise <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "priceOverridePaise"],
          message: "A variant price override must be greater than zero.",
        });
      }
    }
  });

export const taxonomyInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(2000).default(""),
  imageUrl: z.string().trim().max(500).default(""),
  imageAlt: z.string().trim().max(180).default(""),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().trim().max(120).default(""),
  seoDescription: z.string().trim().max(300).default(""),
});

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9_-]{2,30}$/, "Use 3–31 letters or numbers."),
    discountType: z.enum(["percentage", "fixed"]),
    discountValueBps: z.number().int().min(0).max(10000).default(0),
    discountValuePaise: paiseSchema.default(0),
    minimumOrderValuePaise: paiseSchema.default(0),
    maximumDiscountPaise: paiseSchema.nullable().default(null),
    startsAt: z.string().datetime().nullable().default(null),
    expiresAt: z.string().datetime().nullable().default(null),
    usageLimit: z.number().int().positive().max(1000000).nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === "percentage" && (value.discountValueBps < 1 || value.discountValueBps > 10000)) {
      ctx.addIssue({ code: "custom", path: ["discountValueBps"], message: "Enter a percentage between 0.01 and 100." });
    }
    if (value.discountType === "fixed" && value.discountValuePaise < 1) {
      ctx.addIssue({ code: "custom", path: ["discountValuePaise"], message: "Enter a fixed discount greater than zero." });
    }
  });

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  mobile: mobileSchema,
  email: z.union([emailSchema, z.literal("")]).default(""),
  addressLine: z.string().trim().min(5).max(200),
  landmark: z.string().trim().max(120).default(""),
  city: z.string().trim().min(2).max(80),
  state: z.string().refine((value) => (INDIAN_STATES as readonly string[]).includes(value), "Select a state."),
  pinCode: pinSchema,
  notes: z.string().trim().max(500).default(""),
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        variantSku: z.string().trim().toUpperCase().max(64).nullable().default(null),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
  couponCode: z.string().trim().toUpperCase().max(32).default(""),
  idempotencyKey: z.string().trim().regex(/^[a-zA-Z0-9_-]{12,80}$/),
});

export const paymentClaimSchema = z.object({
  publicToken: z.string().trim().min(20).max(120),
  utr: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,30}$/, "Enter the 6–30 character UTR or reference from your UPI app."),
  note: z.string().trim().max(300).default(""),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  consent: z.literal(true, { message: "Consent is required to subscribe." }),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  mobile: z.union([mobileSchema, z.literal("")]).default(""),
  message: z.string().trim().min(10).max(2000),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

export const reviewInputSchema = z.object({
  productId: objectIdSchema,
  name: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1500),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
