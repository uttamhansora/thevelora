import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { objectIdSchema } from "@/lib/validation/common";
import { ProductModel } from "@/models/product";
import { InventoryMovementModel } from "@/models/supporting";
import { writeAudit } from "@/services/audit";

const schema = z.object({
  productId: objectIdSchema,
  variantSku: z.string().trim().toUpperCase().nullable().default(null),
  stockQuantity: z.number().int().nonnegative().max(100000),
});

export async function GET(request: Request) {
  try {
    await requireAdmin("inventory.write", request);
    await connectDB();
    const items = await ProductModel.find({ isArchived: false }).sort({ name: 1 }).select("name sku stockQuantity lowStockThreshold variants").lean();
    return json({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin("inventory.write", request);
    const body = schema.parse(await readJson(request));
    await connectDB();
    const product = await ProductModel.findById(body.productId);
    if (!product) throw new AppError("Product not found.", 404);
    let previous = product.stockQuantity;
    if (body.variantSku) {
      const variant = product.variants.find((item: { sku: string }) => item.sku === body.variantSku);
      if (!variant) throw new AppError("Variant not found.", 404);
      previous = variant.stockQuantity;
      variant.stockQuantity = body.stockQuantity;
    } else if (product.variants.length > 0) {
      throw new AppError("Choose a variant to update stock.", 400);
    } else {
      product.stockQuantity = body.stockQuantity;
    }
    await product.save();
    await InventoryMovementModel.create({
      productId: product._id,
      sku: body.variantSku || product.sku,
      delta: body.stockQuantity - previous,
      reason: "manual_adjustment",
      idempotencyKey: `adjust:${product._id}:${body.variantSku || product.sku}:${Date.now()}`,
    });
    await writeAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "inventory.adjust",
      entityType: "product",
      entityId: body.productId,
      metadata: { sku: body.variantSku || product.sku, from: previous, to: body.stockQuantity },
    });
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
