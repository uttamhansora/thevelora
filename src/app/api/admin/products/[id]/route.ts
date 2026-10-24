import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { handleError, json, readJson } from "@/lib/http";
import { productInputSchema } from "@/lib/validation/catalog";
import { ProductModel } from "@/models/product";
import { writeAudit } from "@/services/audit";
import { deleteProduct, updateProduct } from "@/services/catalog";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin("products.write", request);
    await connectDB();
    const { id } = await context.params;
    const product = await ProductModel.findById(id).lean();
    if (!product) throw new AppError("Product not found.", 404);
    return json({ product });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const admin = await requireAdmin("products.write", request);
    const { id } = await context.params;
    const input = productInputSchema.parse(await readJson(request));
    const product = await updateProduct(id, input);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "product.update", entityType: "product", entityId: id });
    return json({ product });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const admin = await requireAdmin("products.write", request);
    const { id } = await context.params;
    await deleteProduct(id);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "product.delete", entityType: "product", entityId: id });
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
