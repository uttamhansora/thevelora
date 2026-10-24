import { requireAdmin } from "@/lib/auth/guard";
import { handleError, json } from "@/lib/http";
import { writeAudit } from "@/services/audit";
import { duplicateProduct } from "@/services/catalog";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin("products.write", request);
    const { id } = await context.params;
    const product = await duplicateProduct(id);
    await writeAudit({ actorId: admin.id, actorEmail: admin.email, action: "product.duplicate", entityType: "product", entityId: String(product._id), metadata: { sourceId: id } });
    return json({ product }, 201);
  } catch (error) {
    return handleError(error);
  }
}
